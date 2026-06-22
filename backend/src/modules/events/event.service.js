const prisma = require("../../config/prisma");
const { hasOverlap } = require("../../dsa/intervalScheduler");
const ApiError = require("../../utils/ApiError");
const safeUser = require("../../utils/safeUser");
const { scheduleEventLifecycleJobs } = require("../../queues/scheduler");
const { EVENT_STATUSES } = require("./event.validation");

function canModifyEvent(event, user) {
  return user.role === "ADMIN" || event.createdById === user.id;
}

async function getVenueOrThrow(venueId) {
  const venue = await prisma.venue.findUnique({
    where: {
      id: venueId,
    },
  });

  if (!venue) {
    throw new ApiError(404, "Venue not found");
  }

  return venue;
}

async function assertEventRules(data, options = {}) {
  const venue = await getVenueOrThrow(data.venueId);

  if (data.startTime >= data.endTime) {
    throw new ApiError(400, "startTime must be before endTime");
  }

  if (data.registrationDeadline >= data.startTime) {
    throw new ApiError(400, "registrationDeadline must be before startTime");
  }

  if (data.capacity > venue.capacity) {
    throw new ApiError(400, "Event capacity cannot exceed venue capacity");
  }

  const existingEvents = await prisma.event.findMany({
    where: {
      venueId: data.venueId,
      id: options.excludeEventId
        ? {
            not: options.excludeEventId,
          }
        : undefined,
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  const existingIntervals = existingEvents.map((event) => ({
    id: event.id,
    start: event.startTime,
    end: event.endTime,
  }));

  if (hasOverlap(data.startTime, data.endTime, existingIntervals)) {
    throw new ApiError(409, "Venue has a conflicting event in this time range");
  }
}

async function createEvent(data, user) {
  await assertEventRules(data);

  const event = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        ...data,
        createdById: user.id,
      },
    });

    await tx.eventLog.create({
      data: {
        eventId: event.id,
        type: "EVENT_CREATED",
        message: "Event created",
        metadata: {
          createdById: user.id,
        },
      },
    });

    return event;
  });

  await scheduleEventLifecycleJobs(event).catch((error) => {
    console.error("BullMQ event lifecycle scheduling failed:", error);
  });

  return event;
}

function buildEventWhere(query, user) {
  const where = {};

  if (query.status) {
    if (!EVENT_STATUSES.includes(query.status)) {
      throw new ApiError(400, "Invalid event status");
    }

    where.status = query.status;
  }

  if (query.venueId) {
    where.venueId = query.venueId;
  }

  if (query.search) {
    where.OR = [
      {
        title: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (query.upcoming === "true") {
    where.startTime = {
      gte: new Date(),
    };
  }

  if (query.createdByMe === "true") {
    where.createdById = user.id;
  }

  return where;
}

async function listEvents(query, user) {
  const events = await prisma.event.findMany({
    where: buildEventWhere(query, user),
    include: {
      venue: true,
      createdBy: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return events.map((event) => ({
    ...event,
    createdBy: safeUser(event.createdBy),
  }));
}

async function getEventById(id) {
  const event = await prisma.event.findUnique({
    where: {
      id,
    },
    include: {
      venue: true,
      createdBy: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
}

async function getEventDetails(id) {
  const event = await getEventById(id);

  const [confirmedCount, waitlistCount, checkedInCount] = await Promise.all([
    prisma.registration.count({
      where: {
        eventId: id,
        status: {
          in: ["CONFIRMED", "CHECKED_IN"],
        },
      },
    }),
    prisma.waitlistEntry.count({
      where: {
        eventId: id,
        status: "WAITING",
      },
    }),
    prisma.checkIn.count({
      where: {
        eventId: id,
      },
    }),
  ]);

  return {
    ...event,
    createdBy: safeUser(event.createdBy),
    confirmedCount,
    waitlistCount,
    checkedInCount,
    remainingSeats: Math.max(event.capacity - confirmedCount, 0),
  };
}

async function updateEvent(id, data, user) {
  const existingEvent = await getEventById(id);

  if (!canModifyEvent(existingEvent, user)) {
    throw new ApiError(403, "Forbidden");
  }

  const nextEvent = {
    ...existingEvent,
    ...data,
  };

  await assertEventRules(nextEvent, {
    excludeEventId: id,
  });

  const event = await prisma.event.update({
    where: {
      id,
    },
    data,
  });

  await scheduleEventLifecycleJobs(event).catch((error) => {
    console.error("BullMQ event lifecycle rescheduling failed:", error);
  });

  return event;
}

async function deleteEvent(id, user) {
  const event = await getEventById(id);

  if (!canModifyEvent(event, user)) {
    throw new ApiError(403, "Forbidden");
  }

  return prisma.$transaction(async (tx) => {
    await tx.checkIn.deleteMany({
      where: {
        eventId: id,
      },
    });
    await tx.waitlistEntry.deleteMany({
      where: {
        eventId: id,
      },
    });
    await tx.registration.deleteMany({
      where: {
        eventId: id,
      },
    });
    await tx.eventLog.deleteMany({
      where: {
        eventId: id,
      },
    });

    return tx.event.delete({
      where: {
        id,
      },
    });
  });
}

module.exports = {
  createEvent,
  listEvents,
  getEventDetails,
  updateEvent,
  deleteEvent,
};
