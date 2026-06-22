require("../observability/tracing");

const prisma = require("../config/prisma");
const { logger } = require("../observability/logger");
const {
  JOB_NAMES,
  closeQueues,
  getAnalyticsQueue,
  getEventLifecycleQueue,
} = require("./queues");

const MIN_DELAY_MS = 1_000;
const DEFAULT_EVENT_REMINDER_MINUTES = 30;
const DEFAULT_REGISTRATION_REMINDER_MINUTES = 60;
const DEFAULT_ANALYTICS_INTERVAL_MS = 5 * 60 * 1000;

function getNoShowGraceMinutes() {
  return Number(process.env.NO_SHOW_GRACE_MINUTES) || 15;
}

function getEventReminderMinutes() {
  return Number(process.env.EVENT_START_REMINDER_MINUTES) || DEFAULT_EVENT_REMINDER_MINUTES;
}

function getRegistrationReminderMinutes() {
  return Number(process.env.REGISTRATION_DEADLINE_REMINDER_MINUTES) || DEFAULT_REGISTRATION_REMINDER_MINUTES;
}

function getAnalyticsIntervalMs() {
  return Number(process.env.ANALYTICS_REPEAT_MS) || DEFAULT_ANALYTICS_INTERVAL_MS;
}

function getDelayUntil(targetTime) {
  return Math.max(new Date(targetTime).getTime() - Date.now(), MIN_DELAY_MS);
}

async function replaceDelayedJob(queue, name, data, options) {
  if (options.jobId) {
    await queue.remove(options.jobId).catch(() => undefined);
  }

  return queue.add(name, data, options);
}

async function scheduleEventLifecycleJobs(event) {
  if (!event?.id) {
    return [];
  }

  const jobs = [];
  const eventLifecycleQueue = getEventLifecycleQueue();
  const now = Date.now();
  const noShowRunAt = new Date(new Date(event.startTime).getTime() + getNoShowGraceMinutes() * 60 * 1000);
  const registrationReminderAt = new Date(new Date(event.registrationDeadline).getTime() - getRegistrationReminderMinutes() * 60 * 1000);
  const eventReminderAt = new Date(new Date(event.startTime).getTime() - getEventReminderMinutes() * 60 * 1000);

  if (noShowRunAt.getTime() > now && event.status !== "CANCELLED") {
    jobs.push(
      replaceDelayedJob(
        eventLifecycleQueue,
        JOB_NAMES.EVENT_NO_SHOW_RELEASE,
        {
          eventId: event.id,
        },
        {
          jobId: `event:${event.id}:no-show-release`,
          delay: getDelayUntil(noShowRunAt),
        }
      )
    );
  }

  if (registrationReminderAt.getTime() > now && !["CANCELLED", "COMPLETED"].includes(event.status)) {
    jobs.push(
      replaceDelayedJob(
        eventLifecycleQueue,
        JOB_NAMES.REGISTRATION_DEADLINE_REMINDER,
        {
          eventId: event.id,
        },
        {
          jobId: `event:${event.id}:registration-deadline-reminder`,
          delay: getDelayUntil(registrationReminderAt),
        }
      )
    );
  }

  if (eventReminderAt.getTime() > now && !["CANCELLED", "COMPLETED"].includes(event.status)) {
    jobs.push(
      replaceDelayedJob(
        eventLifecycleQueue,
        JOB_NAMES.EVENT_START_REMINDER,
        {
          eventId: event.id,
        },
        {
          jobId: `event:${event.id}:event-start-reminder`,
          delay: getDelayUntil(eventReminderAt),
        }
      )
    );
  }

  return Promise.all(jobs);
}

async function scheduleRecurringJobs() {
  const analyticsQueue = getAnalyticsQueue();
  const eventLifecycleQueue = getEventLifecycleQueue();

  await analyticsQueue.add(
    JOB_NAMES.ANALYTICS_AGGREGATE,
    {},
    {
      jobId: "analytics:aggregate:repeat",
      repeat: {
        every: getAnalyticsIntervalMs(),
      },
    }
  );

  await eventLifecycleQueue.add(
    JOB_NAMES.PROCESS_NO_SHOWS,
    {},
    {
      jobId: "event-lifecycle:no-shows:repeat",
      repeat: {
        every: Number(process.env.NO_SHOW_REPEAT_MS) || 60 * 1000,
      },
    }
  );
}

async function scheduleAllUpcomingEvents() {
  const events = await prisma.event.findMany({
    where: {
      status: {
        in: ["DRAFT", "OPEN", "LIVE"],
      },
      endTime: {
        gte: new Date(),
      },
    },
  });

  for (const event of events) {
    await scheduleEventLifecycleJobs(event);
  }

  return events.length;
}

async function bootstrapSchedules() {
  await scheduleRecurringJobs();
  const eventCount = await scheduleAllUpcomingEvents();

  return {
    eventCount,
  };
}

if (require.main === module) {
  bootstrapSchedules()
    .then(({ eventCount }) => {
      logger.info({ eventCount }, "BullMQ schedules bootstrapped");
    })
    .catch((error) => {
      logger.error({ error }, "BullMQ scheduler bootstrap failed");
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeQueues();
      await prisma.$disconnect();
    });
}

module.exports = {
  bootstrapSchedules,
  scheduleAllUpcomingEvents,
  scheduleEventLifecycleJobs,
  scheduleRecurringJobs,
};
