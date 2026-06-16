const prisma = require("../config/prisma");
const redis = require("../config/redis");

function getCounterKeys(eventId) {
  return {
    registeredCount: `event:${eventId}:registeredCount`,
    checkedInCount: `event:${eventId}:checkedInCount`,
    waitlistCount: `event:${eventId}:waitlistCount`,
  };
}

async function getEventCounters(eventId) {
  const keys = getCounterKeys(eventId);
  const [registeredCount, checkedInCount, waitlistCount] = await redis.mget(
    keys.registeredCount,
    keys.checkedInCount,
    keys.waitlistCount
  );

  return {
    registeredCount: Number(registeredCount || 0),
    checkedInCount: Number(checkedInCount || 0),
    waitlistCount: Number(waitlistCount || 0),
  };
}

async function syncEventCountersFromDb(eventId, options = {}) {
  const [registeredCount, checkedInCount, waitlistCount] = await Promise.all([
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

  const keys = getCounterKeys(eventId);

  await redis.mset(
    keys.registeredCount,
    registeredCount,
    keys.checkedInCount,
    checkedInCount,
    keys.waitlistCount,
    waitlistCount
  );

  if (options.emitSocketUpdate !== false) {
    const { emitCapacityUpdated } = require("./socketEmitter");
    await emitCapacityUpdated(eventId);
  }

  return {
    registeredCount,
    checkedInCount,
    waitlistCount,
  };
}

async function incrementRegistered(eventId) {
  return redis.incr(getCounterKeys(eventId).registeredCount);
}

async function decrementRegistered(eventId) {
  return redis.decr(getCounterKeys(eventId).registeredCount);
}

async function incrementCheckedIn(eventId) {
  return redis.incr(getCounterKeys(eventId).checkedInCount);
}

async function incrementWaitlist(eventId) {
  return redis.incr(getCounterKeys(eventId).waitlistCount);
}

async function decrementWaitlist(eventId) {
  return redis.decr(getCounterKeys(eventId).waitlistCount);
}

module.exports = {
  getCounterKeys,
  getEventCounters,
  syncEventCountersFromDb,
  incrementRegistered,
  decrementRegistered,
  incrementCheckedIn,
  incrementWaitlist,
  decrementWaitlist,
};
