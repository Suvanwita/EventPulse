require("../observability/tracing");

const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { disconnectProducer } = require("../config/kafka");
const { logger } = require("../observability/logger");
const { recordOutboxEvent } = require("../observability/metrics");
const { shutdownTracing } = require("../observability/tracing");
const { withSpan } = require("../observability/spans");
const { publishKafkaMessage } = require("../utils/eventProducer");
const { OUTBOX_STATUS } = require("../utils/outbox");

const BATCH_SIZE = Number(process.env.OUTBOX_PUBLISH_BATCH_SIZE) || 25;
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_PUBLISH_POLL_INTERVAL_MS) || 2500;
const BASE_BACKOFF_MS = Number(process.env.OUTBOX_PUBLISH_BASE_BACKOFF_MS) || 1000;
const MAX_BACKOFF_MS = Number(process.env.OUTBOX_PUBLISH_MAX_BACKOFF_MS) || 60_000;
const PROCESSING_TIMEOUT_MS = Number(process.env.OUTBOX_PROCESSING_TIMEOUT_MS) || 5 * 60_000;

let stopping = false;

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function getNextAttemptAt(attempts) {
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(attempts - 1, 0), MAX_BACKOFF_MS);

  return new Date(Date.now() + delay);
}

async function claimOutboxEvents(limit = BATCH_SIZE) {
  const now = new Date();

  await prisma.outboxEvent.updateMany({
    where: {
      status: OUTBOX_STATUS.PROCESSING,
      lockedAt: {
        lt: new Date(Date.now() - PROCESSING_TIMEOUT_MS),
      },
    },
    data: {
      status: OUTBOX_STATUS.PENDING,
      lockedAt: null,
    },
  });

  const candidates = await prisma.outboxEvent.findMany({
    where: {
      status: OUTBOX_STATUS.PENDING,
      nextAttemptAt: {
        lte: now,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
  });

  if (candidates.length === 0) {
    return [];
  }

  const ids = candidates.map((event) => event.id);
  await prisma.outboxEvent.updateMany({
    where: {
      id: {
        in: ids,
      },
      status: OUTBOX_STATUS.PENDING,
    },
    data: {
      status: OUTBOX_STATUS.PROCESSING,
      lockedAt: now,
    },
  });

  return prisma.outboxEvent.findMany({
    where: {
      id: {
        in: ids,
      },
      status: OUTBOX_STATUS.PROCESSING,
      lockedAt: now,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function markPublished(outboxEvent) {
  await prisma.outboxEvent.update({
    where: {
      id: outboxEvent.id,
    },
    data: {
      status: OUTBOX_STATUS.PUBLISHED,
      publishedAt: new Date(),
      lockedAt: null,
      error: null,
    },
  });
  recordOutboxEvent("published");
}

async function markFailedOrRetry(outboxEvent, error) {
  const attempts = outboxEvent.attempts + 1;
  const exhausted = attempts >= outboxEvent.maxAttempts;

  await prisma.outboxEvent.update({
    where: {
      id: outboxEvent.id,
    },
    data: {
      status: exhausted ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.PENDING,
      attempts,
      nextAttemptAt: exhausted ? outboxEvent.nextAttemptAt : getNextAttemptAt(attempts),
      failedAt: exhausted ? new Date() : null,
      lockedAt: null,
      error: serializeError(error),
    },
  });
  recordOutboxEvent(exhausted ? "failed" : "retry_scheduled");

  logger.error({
    error,
    outboxEventId: outboxEvent.id,
    topic: outboxEvent.topic,
    attempts,
    exhausted,
  }, exhausted ? "Kafka outbox event failed permanently" : "Kafka outbox event scheduled for retry");
}

async function publishOutboxEvent(outboxEvent) {
  return withSpan("outbox.publish", {
    "messaging.system": "kafka",
    "messaging.destination.name": outboxEvent.topic,
    "messaging.operation": "publish",
    "eventpulse.outbox.id": outboxEvent.id,
    "eventpulse.outbox.attempt": outboxEvent.attempts + 1,
  }, async () => {
    await publishKafkaMessage(outboxEvent.topic, outboxEvent.payload, {
      key: outboxEvent.key || undefined,
      headers: {
        ...(outboxEvent.headers || {}),
        "eventpulse-outbox-id": outboxEvent.id,
        "eventpulse-outbox-attempt": String(outboxEvent.attempts + 1),
      },
    });

    await markPublished(outboxEvent);

    logger.info({
      outboxEventId: outboxEvent.id,
      topic: outboxEvent.topic,
      key: outboxEvent.key,
    }, "Kafka outbox event published");
  });
}

async function publishPendingOutboxBatch() {
  const events = await claimOutboxEvents();

  for (const outboxEvent of events) {
    try {
      await publishOutboxEvent(outboxEvent);
    } catch (error) {
      await markFailedOrRetry(outboxEvent, error);
    }
  }

  return events.length;
}

async function runOutboxPublisher() {
  logger.info({
    batchSize: BATCH_SIZE,
    pollIntervalMs: POLL_INTERVAL_MS,
  }, "Kafka outbox publisher started");

  while (!stopping) {
    const published = await publishPendingOutboxBatch();

    if (published === 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

async function shutdown(signal) {
  stopping = true;
  logger.info({ signal }, "Kafka outbox publisher shutdown requested");
  await disconnectProducer();
  try {
    await redis.quit();
  } catch {
    // Redis may not be connected when this worker only publishes Kafka events.
  }
  await prisma.$disconnect();
  await shutdownTracing().catch((error) => logger.error({ error }, "OpenTelemetry shutdown failed"));
}

if (require.main === module) {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await shutdown(signal);
      process.exit(0);
    });
  }

  runOutboxPublisher().catch(async (error) => {
    logger.error({ error }, "Kafka outbox publisher crashed");
    await shutdown("error");
    process.exit(1);
  });
}

module.exports = {
  claimOutboxEvents,
  publishOutboxEvent,
  publishPendingOutboxBatch,
  runOutboxPublisher,
};
