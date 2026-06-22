const { publishKafkaMessage } = require("../utils/eventProducer");
const { DLQ_TOPICS, RETRY_TOPICS } = require("../utils/kafkaTopics");
const { validateKafkaMessage } = require("../utils/kafkaSchemas");

const DEFAULT_MAX_ATTEMPTS = Number(process.env.KAFKA_CONSUMER_MAX_ATTEMPTS) || 3;
const BASE_BACKOFF_MS = Number(process.env.KAFKA_RETRY_BASE_BACKOFF_MS) || 5_000;
const MAX_BACKOFF_MS = Number(process.env.KAFKA_RETRY_MAX_BACKOFF_MS) || 60_000;

function getBackoffMs(attempt) {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(attempt - 1, 0), MAX_BACKOFF_MS);
}

function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack || null,
  };
}

function getOriginalPayload(messageValue) {
  if (messageValue?.originalPayload) {
    return messageValue.originalPayload;
  }

  return messageValue;
}

function buildRetryEnvelope({
  topic,
  payload,
  message,
  error,
  groupId,
  category,
  attempt,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) {
  const currentAttempt = Number(attempt || 0) + 1;
  const originalPayload = getOriginalPayload(payload);
  const originalTopic = payload?.originalTopic || topic;
  const originalTimestamp = payload?.originalTimestamp || message.timestamp || new Date().toISOString();
  const retryAfter = new Date(Date.now() + getBackoffMs(currentAttempt)).toISOString();

  return {
    originalTopic,
    originalPayload,
    originalKey: payload?.originalKey || message.key?.toString() || null,
    originalTimestamp,
    attempt: currentAttempt,
    maxAttempts,
    failedAt: new Date().toISOString(),
    retryAfter,
    error: serializeError(error),
    consumer: {
      groupId,
      category,
    },
  };
}

async function publishRetryOrDlq(context) {
  const maxAttempts = context.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const envelope = buildRetryEnvelope({
    ...context,
    maxAttempts,
  });
  const retryTopic = RETRY_TOPICS[context.category];
  const dlqTopic = DLQ_TOPICS[context.category];
  const targetTopic = envelope.attempt >= maxAttempts ? dlqTopic : retryTopic;

  if (!targetTopic) {
    throw new Error(`No retry/DLQ topic configured for category ${context.category}`);
  }

  validateKafkaMessage(targetTopic, envelope, targetTopic === dlqTopic ? "DLQ envelope" : "retry envelope");

  await publishKafkaMessage(targetTopic, envelope, {
    key: envelope.originalKey || envelope.originalTopic,
    headers: {
      "x-original-topic": envelope.originalTopic,
      "x-attempt": String(envelope.attempt),
      "x-error": envelope.error.message,
    },
  });

  return {
    targetTopic,
    envelope,
    deadLettered: targetTopic === dlqTopic,
  };
}

module.exports = {
  DEFAULT_MAX_ATTEMPTS,
  buildRetryEnvelope,
  getOriginalPayload,
  publishRetryOrDlq,
};
