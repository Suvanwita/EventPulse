const { connectProducer } = require("../config/kafka");
const { DLQ_TOPICS, RETRY_TOPICS, TOPICS } = require("./kafkaTopics");
const {
  formatKafkaValidationError,
  validateKafkaMessage,
} = require("./kafkaSchemas");
const { logger } = require("../observability/logger");
const { withSpan } = require("../observability/spans");
const {
  enqueueOutboxEvent,
  normalizeOutboxPayload,
  safeEnqueueOutboxEvent,
} = require("./outbox");

function normalizePayload(payload = {}) {
  return normalizeOutboxPayload(payload);
}

async function publishKafkaMessage(topic, message, options = {}) {
  return withSpan("kafka.publish", {
    "messaging.system": "kafka",
    "messaging.destination.name": topic,
    "messaging.operation": "publish",
    "messaging.kafka.message_key": options.key || "",
  }, async () => {
    const producer = await connectProducer();
    const value = typeof message === "string" ? message : JSON.stringify(message);

    await producer.send({
      topic,
      messages: [
        {
          key: options.key,
          value,
          headers: options.headers,
        },
      ],
    });

    logger.info({ topic, key: options.key }, "Kafka message published");

    return {
      published: true,
      topic,
    };
  });
}

async function publishEvent(topic, payload, options = {}) {
  try {
    const message = normalizePayload(payload);
    validateKafkaMessage(topic, message, "outgoing message");

    const outboxOptions = {
      key: options.key || message.eventId || message.userId || undefined,
      headers: options.headers,
      maxAttempts: options.maxAttempts,
    };
    const outboxResult = options.tx
      ? {
          enqueued: true,
          outboxEventId: (await enqueueOutboxEvent(options.tx, topic, message, outboxOptions)).id,
        }
      : await safeEnqueueOutboxEvent(null, topic, message, outboxOptions);

    return {
      published: false,
      enqueued: outboxResult.enqueued,
      topic,
      payload: message,
      outboxEventId: outboxResult.outboxEventId,
    };
  } catch (error) {
    logger.error(
      {
        topic,
        error,
        validation: formatKafkaValidationError(error),
      },
      "Kafka publish failed"
    );

    if (options.tx) {
      throw error;
    }

    return {
      published: false,
      topic,
      error,
    };
  }
}

function publishRegistrationCreated(payload, options) {
  return publishEvent(TOPICS.REGISTRATION_CREATED, payload, options);
}

function publishWaitlistJoined(payload, options) {
  return publishEvent(TOPICS.WAITLIST_JOINED, payload, options);
}

function publishWaitlistPromoted(payload, options) {
  return publishEvent(TOPICS.WAITLIST_PROMOTED, payload, options);
}

function publishRegistrationCancelled(payload, options) {
  return publishEvent(TOPICS.REGISTRATION_CANCELLED, payload, options);
}

function publishCheckinCompleted(payload, options) {
  return publishEvent(TOPICS.CHECKIN_COMPLETED, payload, options);
}

function publishScanFailed(payload, options) {
  return publishEvent(TOPICS.SCAN_FAILED, payload, options);
}

function publishNoShowReleased(payload, options) {
  return publishEvent(TOPICS.NO_SHOW_RELEASED, payload, options);
}

function publishCrewAccessGranted(payload, options) {
  return publishEvent(TOPICS.CREW_ACCESS_GRANTED, payload, options);
}

function publishCrewAccessUpdated(payload, options) {
  return publishEvent(TOPICS.CREW_ACCESS_UPDATED, payload, options);
}

function publishCrewAccessRevoked(payload, options) {
  return publishEvent(TOPICS.CREW_ACCESS_REVOKED, payload, options);
}

function publishCrewSpecialEntryUsed(payload, options) {
  return publishEvent(TOPICS.CREW_SPECIAL_ENTRY_USED, payload, options);
}

module.exports = {
  DLQ_TOPICS,
  RETRY_TOPICS,
  TOPICS,
  publishKafkaMessage,
  publishEvent,
  publishCrewAccessGranted,
  publishCrewAccessRevoked,
  publishCrewAccessUpdated,
  publishCrewSpecialEntryUsed,
  publishRegistrationCreated,
  publishWaitlistJoined,
  publishWaitlistPromoted,
  publishRegistrationCancelled,
  publishCheckinCompleted,
  publishScanFailed,
  publishNoShowReleased,
};
