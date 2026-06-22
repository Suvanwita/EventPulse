require("../observability/tracing");

const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { disconnectProducer, kafka } = require("../config/kafka");
const { logger } = require("../observability/logger");
const { shutdownTracing } = require("../observability/tracing");
const { DLQ_TOPICS, RETRY_TOPICS, TOPICS } = require("../utils/kafkaTopics");
const { createConsumerRunner } = require("./consumerRunner");
const { buildTopicHandlers } = require("./eventHandlers");

const allHandlers = buildTopicHandlers();

function pickHandlers(topics) {
  return topics.reduce((handlers, topic) => {
    handlers[topic] = allHandlers[topic];
    return handlers;
  }, {});
}

const consumerDefinitions = [
  {
    groupId: process.env.KAFKA_REGISTRATION_CONSUMER_GROUP || "eventpulse-registration-consumer",
    category: "REGISTRATION",
    retryTopic: RETRY_TOPICS.REGISTRATION,
    topicHandlers: pickHandlers([
      TOPICS.REGISTRATION_CREATED,
      TOPICS.WAITLIST_JOINED,
      TOPICS.WAITLIST_PROMOTED,
      TOPICS.REGISTRATION_CANCELLED,
      TOPICS.NO_SHOW_RELEASED,
    ]),
  },
  {
    groupId: process.env.KAFKA_CHECKIN_CONSUMER_GROUP || "eventpulse-checkin-consumer",
    category: "CHECKIN",
    retryTopic: RETRY_TOPICS.CHECKIN,
    topicHandlers: pickHandlers([
      TOPICS.CHECKIN_COMPLETED,
      TOPICS.SCAN_FAILED,
    ]),
  },
  {
    groupId: process.env.KAFKA_CREW_CONSUMER_GROUP || "eventpulse-crew-consumer",
    category: "CREW",
    retryTopic: RETRY_TOPICS.CREW,
    topicHandlers: pickHandlers([
      TOPICS.CREW_ACCESS_GRANTED,
      TOPICS.CREW_ACCESS_UPDATED,
      TOPICS.CREW_ACCESS_REVOKED,
      TOPICS.CREW_SPECIAL_ENTRY_USED,
    ]),
  },
];

async function ensureKafkaTopics() {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const topicNames = [
      ...Object.values(TOPICS),
      ...Object.values(RETRY_TOPICS),
      ...Object.values(DLQ_TOPICS),
    ];

    await admin.createTopics({
      waitForLeaders: true,
      topics: topicNames.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });

    logger.info({
      count: topicNames.length,
    }, "Kafka topics ensured");
  } finally {
    await admin.disconnect();
  }
}

async function startConsumers() {
  await ensureKafkaTopics();

  const runners = consumerDefinitions.map((definition) =>
    createConsumerRunner(definition)
  );

  await Promise.all(runners.map((runner) => runner.start()));

  return runners;
}

async function shutdown(runners, signal) {
  logger.info({
    signal,
  }, "Kafka consumer shutdown requested");

  await Promise.allSettled(runners.map((runner) => runner.stop()));
  await disconnectProducer();
  try {
    await redis.quit();
  } catch {
    // Redis may not have opened a connection during this process.
  }
  await prisma.$disconnect();
  await shutdownTracing().catch((error) => logger.error({ error }, "OpenTelemetry shutdown failed"));
}

if (require.main === module) {
  let runners = [];

  startConsumers()
    .then((startedRunners) => {
      runners = startedRunners;
    })
    .catch(async (error) => {
      logger.error({ error }, "Kafka consumers failed to start");
      await shutdown(runners, "startup-error");
      process.exit(1);
    });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await shutdown(runners, signal);
      process.exit(0);
    });
  }
}

module.exports = {
  consumerDefinitions,
  startConsumers,
};
