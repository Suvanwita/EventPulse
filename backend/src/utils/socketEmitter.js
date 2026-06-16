const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { getSocketServer } = require("../sockets");
const { getEventRoom } = require("../sockets/event.socket");
const { getCounterKeys, syncEventCountersFromDb } = require("./eventCounters");

function getTimestamp() {
  return new Date().toISOString();
}

function emitToEventRoom(eventId, eventName, payload) {
  const io = getSocketServer();

  if (!io || !eventId) {
    return false;
  }

  io.to(getEventRoom(eventId)).emit(eventName, {
    eventId,
    timestamp: getTimestamp(),
    ...payload,
  });

  return true;
}

async function getDbCounters(eventId) {
  const [event, registeredCount, checkedInCount, waitlistCount] =
    await Promise.all([
      prisma.event.findUnique({
        where: {
          id: eventId,
        },
        select: {
          capacity: true,
        },
      }),
      prisma.registration.count({
        where: {
          eventId,
          status: {
            in: ["CONFIRMED", "CHECKED_IN"],
          },
        },
      }),
      prisma.checkIn.count({
        where: {
          eventId,
        },
      }),
      prisma.waitlistEntry.count({
        where: {
          eventId,
          status: "WAITING",
        },
      }),
    ]);

  return {
    capacity: event?.capacity || 0,
    registeredCount,
    checkedInCount,
    waitlistCount,
  };
}

async function getCapacityPayload(eventId) {
  const keys = getCounterKeys(eventId);
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      capacity: true,
    },
  });

  let counters;

  try {
    const [registeredValue, checkedInValue, waitlistValue] = await redis.mget(
      keys.registeredCount,
      keys.checkedInCount,
      keys.waitlistCount
    );

    if (
      registeredValue === null ||
      checkedInValue === null ||
      waitlistValue === null
    ) {
      counters = await getDbCounters(eventId);
      await syncEventCountersFromDb(eventId, {
        emitSocketUpdate: false,
      });
    } else {
      counters = {
        capacity: event?.capacity || 0,
        registeredCount: Number(registeredValue),
        checkedInCount: Number(checkedInValue),
        waitlistCount: Number(waitlistValue),
      };
    }
  } catch (error) {
    console.error("Redis counter read failed, falling back to PostgreSQL:", error);
    counters = await getDbCounters(eventId);
  }

  return {
    eventId,
    registeredCount: counters.registeredCount,
    checkedInCount: counters.checkedInCount,
    waitlistCount: counters.waitlistCount,
    remainingSeats: Math.max(counters.capacity - counters.registeredCount, 0),
    timestamp: getTimestamp(),
  };
}

async function emitCapacityUpdated(eventId) {
  const payload = await getCapacityPayload(eventId);

  emitToEventRoom(eventId, "capacity-updated", payload);
  return payload;
}

function emitRegistrationUpdated(eventId, payload = {}) {
  return emitToEventRoom(eventId, "registration-updated", payload);
}

function emitWaitlistUpdated(eventId, payload = {}) {
  return emitToEventRoom(eventId, "waitlist-updated", payload);
}

function emitCheckinUpdated(eventId, payload = {}) {
  return emitToEventRoom(eventId, "checkin-updated", payload);
}

async function emitEntryRateUpdated(eventId) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const checkIns = await prisma.checkIn.findMany({
    where: {
      eventId,
      scannedAt: {
        gte: fiveMinutesAgo,
      },
    },
    select: {
      scannedAt: true,
    },
    orderBy: {
      scannedAt: "asc",
    },
  });

  const entryRatePerMinute = Number((checkIns.length / 5).toFixed(2));
  const payload = {
    entryRatePerMinute,
    sampleSize: checkIns.length,
    windowSeconds: 300,
  };

  emitToEventRoom(eventId, "entry-rate-updated", payload);
  return payload;
}

function emitNoShowReleased(eventId, payload = {}) {
  return emitToEventRoom(eventId, "no-show-released", payload);
}

module.exports = {
  emitCapacityUpdated,
  emitCheckinUpdated,
  emitEntryRateUpdated,
  emitNoShowReleased,
  emitRegistrationUpdated,
  emitToEventRoom,
  emitWaitlistUpdated,
  getCapacityPayload,
};
