const { Queue } = require("bullmq");

const { getBullConnection } = require("./connection");

const QUEUE_NAMES = {
  EVENT_LIFECYCLE: "eventpulse-event-lifecycle",
  NOTIFICATIONS: "eventpulse-notifications",
  ANALYTICS: "eventpulse-analytics",
};

const JOB_NAMES = {
  PROCESS_NO_SHOWS: "process-no-shows",
  EVENT_NO_SHOW_RELEASE: "event-no-show-release",
  REGISTRATION_DEADLINE_REMINDER: "registration-deadline-reminder",
  EVENT_START_REMINDER: "event-start-reminder",
  CREATE_NOTIFICATION: "create-notification",
  ANALYTICS_AGGREGATE: "analytics-aggregate",
};

const defaultJobOptions = {
  attempts: Number(process.env.BULLMQ_JOB_ATTEMPTS) || 3,
  backoff: {
    type: "exponential",
    delay: Number(process.env.BULLMQ_BACKOFF_DELAY_MS) || 5_000,
  },
  removeOnComplete: {
    age: Number(process.env.BULLMQ_REMOVE_COMPLETE_AGE_SECONDS) || 24 * 60 * 60,
    count: Number(process.env.BULLMQ_REMOVE_COMPLETE_COUNT) || 1_000,
  },
  removeOnFail: {
    age: Number(process.env.BULLMQ_REMOVE_FAIL_AGE_SECONDS) || 7 * 24 * 60 * 60,
    count: Number(process.env.BULLMQ_REMOVE_FAIL_COUNT) || 5_000,
  },
};

const queues = new Map();

function getQueue(name) {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getBullConnection(),
        defaultJobOptions,
      })
    );
  }

  return queues.get(name);
}

function getEventLifecycleQueue() {
  return getQueue(QUEUE_NAMES.EVENT_LIFECYCLE);
}

function getNotificationQueue() {
  return getQueue(QUEUE_NAMES.NOTIFICATIONS);
}

function getAnalyticsQueue() {
  return getQueue(QUEUE_NAMES.ANALYTICS);
}

async function closeQueues() {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}

module.exports = {
  JOB_NAMES,
  QUEUE_NAMES,
  closeQueues,
  defaultJobOptions,
  getAnalyticsQueue,
  getEventLifecycleQueue,
  getNotificationQueue,
};
