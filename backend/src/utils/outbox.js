const prisma = require("../config/prisma");
const { logger } = require("../observability/logger");
const { recordOutboxEvent } = require("../observability/metrics");
const {
  formatKafkaValidationError,
  validateKafkaMessage,
} = require("./kafkaSchemas");

const OUTBOX_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
};

function normalizeOutboxPayload(payload = {}) {
  const message = {
    userId: payload.userId || null,
    registrationId: payload.registrationId || null,
    timestamp: payload.timestamp || new Date().toISOString(),
    metadata: payload.metadata || {},
  };

  if (payload.eventId !== undefined && payload.eventId !== null) {
    message.eventId = payload.eventId;
  }

  return message;
}

async function enqueueOutboxEvent(client, topic, payload, options = {}) {
  const db = client || prisma;
  const message = normalizeOutboxPayload(payload);

  validateKafkaMessage(topic, message, "outbox message");

  const outboxEvent = await db.outboxEvent.create({
    data: {
      topic,
      key: options.key || message.eventId || message.userId || null,
      payload: message,
      headers: options.headers || null,
      maxAttempts: options.maxAttempts || Number(process.env.OUTBOX_MAX_ATTEMPTS) || 10,
    },
  });

  logger.info({
    outboxEventId: outboxEvent.id,
    topic,
    key: outboxEvent.key,
  }, "Kafka outbox event enqueued");
  recordOutboxEvent("enqueued");

  return outboxEvent;
}

async function safeEnqueueOutboxEvent(client, topic, payload, options = {}) {
  try {
    const outboxEvent = await enqueueOutboxEvent(client, topic, payload, options);

    return {
      enqueued: true,
      topic,
      payload: outboxEvent.payload,
      outboxEventId: outboxEvent.id,
    };
  } catch (error) {
    logger.error({
      topic,
      error,
      validation: formatKafkaValidationError(error),
    }, "Kafka outbox enqueue failed");
    recordOutboxEvent("enqueue_failed");

    return {
      enqueued: false,
      topic,
      error,
    };
  }
}

module.exports = {
  OUTBOX_STATUS,
  enqueueOutboxEvent,
  normalizeOutboxPayload,
  safeEnqueueOutboxEvent,
};
