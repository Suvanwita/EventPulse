const { createNotification } = require("../modules/notifications/notification.service");
const { processEvent, runNoShowWorker } = require("../workers/noShowWorker");
const { runAnalyticsWorker } = require("../workers/analyticsWorker");
const prisma = require("../config/prisma");

async function enqueueNotification(data, options = {}) {
  const { JOB_NAMES, getNotificationQueue } = require("./queues");

  return getNotificationQueue().add(JOB_NAMES.CREATE_NOTIFICATION, data, {
    jobId: options.jobId,
  });
}

async function handleProcessNoShows() {
  return runNoShowWorker();
}

async function handleEventNoShowRelease(job) {
  const eventId = job.data?.eventId;

  if (!eventId) {
    throw new Error("eventId is required for no-show release jobs");
  }

  return processEvent({
    id: eventId,
  });
}

async function handleAnalyticsAggregate() {
  return runAnalyticsWorker();
}

async function handleCreateNotification(job) {
  return createNotification(job.data);
}

async function handleRegistrationDeadlineReminder(job) {
  const eventId = job.data?.eventId;
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      createdById: true,
      registrationDeadline: true,
    },
  });

  if (!event || ["CANCELLED", "COMPLETED"].includes(event.status)) {
    return {
      skipped: true,
      reason: "event unavailable or inactive",
    };
  }

  await enqueueNotification(
    {
      userId: event.createdById,
      eventId: event.id,
      type: "SYSTEM",
      title: "Registration deadline approaching",
      message: `Registration for ${event.title} closes soon.`,
      actionUrl: `/organizer/events/${event.id}`,
      metadata: {
        reminderType: "registration-deadline",
        registrationDeadline: event.registrationDeadline,
      },
    },
    {
      jobId: `notification:${event.id}:registration-deadline:${event.createdById}`,
    }
  );

  return {
    notified: 1,
  };
}

async function handleEventStartReminder(job) {
  const eventId = job.data?.eventId;
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      startTime: true,
      registrations: {
        where: {
          status: {
            in: ["CONFIRMED", "CHECKED_IN"],
          },
        },
        select: {
          userId: true,
        },
      },
    },
  });

  if (!event || ["CANCELLED", "COMPLETED"].includes(event.status)) {
    return {
      skipped: true,
      reason: "event unavailable or inactive",
    };
  }

  const uniqueUserIds = [...new Set(event.registrations.map((registration) => registration.userId))];

  for (const userId of uniqueUserIds) {
    await enqueueNotification(
      {
        userId,
        eventId: event.id,
        type: "SYSTEM",
        title: "Event starts soon",
        message: `${event.title} starts soon. Keep your QR pass ready.`,
        actionUrl: `/pass/${event.id}`,
        metadata: {
          reminderType: "event-start",
          startTime: event.startTime,
        },
      },
      {
        jobId: `notification:${event.id}:event-start:${userId}`,
      }
    );
  }

  return {
    notified: uniqueUserIds.length,
  };
}

async function handleJob(job) {
  const { JOB_NAMES } = require("./queues");

  switch (job.name) {
    case JOB_NAMES.PROCESS_NO_SHOWS:
      return handleProcessNoShows(job);
    case JOB_NAMES.EVENT_NO_SHOW_RELEASE:
      return handleEventNoShowRelease(job);
    case JOB_NAMES.REGISTRATION_DEADLINE_REMINDER:
      return handleRegistrationDeadlineReminder(job);
    case JOB_NAMES.EVENT_START_REMINDER:
      return handleEventStartReminder(job);
    case JOB_NAMES.CREATE_NOTIFICATION:
      return handleCreateNotification(job);
    case JOB_NAMES.ANALYTICS_AGGREGATE:
      return handleAnalyticsAggregate(job);
    default:
      throw new Error(`Unknown BullMQ job ${job.name}`);
  }
}

module.exports = {
  handleAnalyticsAggregate,
  handleCreateNotification,
  handleEventNoShowRelease,
  handleEventStartReminder,
  handleJob,
  handleProcessNoShows,
  handleRegistrationDeadlineReminder,
};
