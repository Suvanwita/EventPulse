const { kafka } = require("../config/kafka");
const { DEFAULT_MAX_ATTEMPTS, getOriginalPayload, publishRetryOrDlq } = require("./kafkaRetry");

const MAX_RETRY_SLEEP_MS = Number(process.env.KAFKA_RETRY_MAX_SLEEP_MS) || 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMessageValue(message) {
  const raw = message.value?.toString();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.message = `Invalid Kafka JSON payload: ${error.message}`;
    throw error;
  }
}

async function waitForRetryWindow(payload, topic) {
  if (!payload?.retryAfter) {
    return;
  }

  const retryAt = new Date(payload.retryAfter).getTime();
  const waitMs = retryAt - Date.now();

  if (waitMs > 0) {
    const boundedWait = Math.min(waitMs, MAX_RETRY_SLEEP_MS);
    console.log("Kafka retry backoff wait", {
      topic,
      originalTopic: payload.originalTopic,
      attempt: payload.attempt,
      waitMs: boundedWait,
    });
    await sleep(boundedWait);
  }
}

function createConsumerRunner({
  groupId,
  category,
  topicHandlers,
  retryTopic,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) {
  const consumer = kafka.consumer({ groupId });
  const topics = [...Object.keys(topicHandlers), retryTopic].filter(Boolean);

  async function processMessage({ topic, partition, message }) {
    let parsedPayload = null;
    let isRetry = topic === retryTopic;
    let originalTopic = topic;
    let payload = null;
    let attempt = 0;

    try {
      parsedPayload = parseMessageValue(message);
      originalTopic = isRetry ? parsedPayload.originalTopic : topic;
      const handler = topicHandlers[originalTopic];

      if (!handler) {
        throw new Error(`No Kafka handler registered for topic ${originalTopic}`);
      }

      attempt = isRetry ? Number(parsedPayload.attempt || 0) : 0;

      if (isRetry) {
        await waitForRetryWindow(parsedPayload, topic);
      }

      payload = isRetry ? getOriginalPayload(parsedPayload) : parsedPayload;

      await handler(payload, {
        topic: originalTopic,
        consumedTopic: topic,
        partition,
        offset: message.offset,
        key: message.key?.toString() || null,
        timestamp: message.timestamp,
        attempt,
        isRetry,
      });
      console.log("Kafka message processed", {
        groupId,
        topic,
        originalTopic,
        partition,
        offset: message.offset,
        attempt,
      });
    } catch (error) {
      const result = await publishRetryOrDlq({
        topic: originalTopic,
        payload: parsedPayload || {
          originalTopic,
          originalPayload: {
            raw: message.value?.toString() || null,
          },
        },
        message,
        error,
        groupId,
        category,
        attempt,
        maxAttempts,
      });

      console.error(result.deadLettered ? "Kafka message moved to DLQ" : "Kafka message scheduled for retry", {
        groupId,
        topic: originalTopic,
        targetTopic: result.targetTopic,
        attempt: result.envelope.attempt,
        maxAttempts,
        error: error.message,
      });
    }
  }

  async function start() {
    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({
        topic,
        fromBeginning: false,
      });
    }

    console.log("Kafka consumer started", {
      groupId,
      category,
      topics,
    });

    await consumer.run({
      eachMessage: processMessage,
    });
  }

  async function stop() {
    console.log("Kafka consumer stopping", {
      groupId,
      category,
    });
    await consumer.disconnect();
  }

  return {
    start,
    stop,
  };
}

module.exports = {
  createConsumerRunner,
};
