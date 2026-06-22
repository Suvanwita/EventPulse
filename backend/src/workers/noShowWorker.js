require("../observability/tracing");

const crypto = require("crypto");

const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { logger } = require("../observability/logger");
const { getFirstAvailableSeat } = require("../dsa/seatAllocator");
const { syncEventCountersFromDb } = require("../utils/eventCounters");
const {
  publishNoShowReleased,
  publishWaitlistPromoted,
} = require("../utils/eventProducer");
const { withRedisLock } = require("../utils/redisLock");
const {
  emitCapacityUpdated,
  emitNoShowReleased,
  emitRegistrationUpdated,
  emitWaitlistUpdated,
} = require("../utils/socketEmitter");

const GRACE_PERIOD_MINUTES = Number(process.env.NO_SHOW_GRACE_MINUTES) || 15;
const REGISTRATION_LOCK_TTL_MS = 10_000;

function createQrTokenHash(eventId, userId) {
  return crypto
    .createHash("sha256")
    .update(`${eventId}:${userId}:${crypto.randomUUID()}`)
    .digest("hex");
}

async function runBestEffort(label, operation) {
  try {
    return await operation();
  } catch (error) {
    logger.error({ error, label }, "Best-effort no-show worker operation failed");
    return null;
  }
}

async function getOccupiedSeats(tx, eventId) {
  const registrations = await tx.registration.findMany({
    where: {
      eventId,
      status: {
        in: ["CONFIRMED", "CHECKED_IN"],
      },
      seatNumber: {
        not: null,
      },
    },
    select: {
      seatNumber: true,
    },
  });

  return registrations.map((registration) => registration.seatNumber);
}

async function promoteNextWaiting(tx, event) {
  const occupiedSeats = await getOccupiedSeats(tx, event.id);
  const seatNumber = getFirstAvailableSeat(event.venue, occupiedSeats);

  if (!seatNumber) {
    return null;
  }

  const waitlistEntry = await tx.waitlistEntry.findFirst({
    where: {
      eventId: event.id,
      status: "WAITING",
    },
    orderBy: {
      position: "asc",
    },
  });

  if (!waitlistEntry) {
    return null;
  }

  const registration = await tx.registration.update({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: waitlistEntry.userId,
      },
    },
    data: {
      status: "CONFIRMED",
      seatNumber,
      qrTokenHash: createQrTokenHash(event.id, waitlistEntry.userId),
      checkedInAt: null,
    },
  });

  await tx.waitlistEntry.update({
    where: {
      id: waitlistEntry.id,
    },
    data: {
      status: "PROMOTED",
    },
  });

  await tx.eventLog.create({
    data: {
      eventId: event.id,
      type: "WAITLIST_PROMOTED",
      message: "Waitlist entry promoted after no-show release",
      metadata: {
        waitlistEntryId: waitlistEntry.id,
        registrationId: registration.id,
        userId: waitlistEntry.userId,
        seatNumber,
      },
    },
  });

  return {
    waitlistEntry,
    registration,
  };
}

async function processEvent(event) {
  return withRedisLock(
    `lock:event:${event.id}:registration`,
    REGISTRATION_LOCK_TTL_MS,
    async () => {
      const result = await prisma.$transaction(async (tx) => {
        const currentEvent = await tx.event.findUnique({
          where: {
            id: event.id,
          },
          include: {
            venue: true,
          },
        });

        if (!currentEvent || currentEvent.status !== "LIVE") {
          return {
            released: [],
            promoted: [],
          };
        }

        const noShowRegistrations = await tx.registration.findMany({
          where: {
            eventId: currentEvent.id,
            status: "CONFIRMED",
            checkedInAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        const released = [];
        const promoted = [];

        for (const registration of noShowRegistrations) {
          const updatedRegistration = await tx.registration.update({
            where: {
              id: registration.id,
            },
            data: {
              status: "NO_SHOW",
              seatNumber: null,
              qrTokenHash: null,
            },
          });

          await tx.eventLog.create({
            data: {
              eventId: currentEvent.id,
              type: "NO_SHOW_RELEASED",
              message: "No-show registration released",
              metadata: {
                registrationId: registration.id,
                userId: registration.userId,
                releasedSeat: registration.seatNumber,
              },
            },
          });

          released.push(updatedRegistration);

          if (currentEvent.waitlistCapacity > 0) {
            const promotedEntry = await promoteNextWaiting(tx, currentEvent);

            if (promotedEntry) {
              promoted.push(promotedEntry);
            }
          }
        }

        return {
          released,
          promoted,
        };
      });

      for (const registration of result.released) {
        emitNoShowReleased(event.id, {
          registration,
        });
        emitRegistrationUpdated(event.id, {
          action: "no_show",
          registration,
        });
        await publishNoShowReleased({
          eventId: event.id,
          userId: registration.userId,
          registrationId: registration.id,
          metadata: {
            status: registration.status,
          },
        });
      }

      for (const promotion of result.promoted) {
        emitWaitlistUpdated(event.id, {
          action: "promoted",
          waitlistEntry: promotion.waitlistEntry,
        });
        emitRegistrationUpdated(event.id, {
          action: "promoted",
          registration: promotion.registration,
        });
        await publishWaitlistPromoted({
          eventId: event.id,
          userId: promotion.waitlistEntry.userId,
          registrationId: promotion.registration.id,
          metadata: {
            waitlistEntryId: promotion.waitlistEntry.id,
            seatNumber: promotion.registration.seatNumber,
          },
        });
      }

      await runBestEffort("Redis event counter sync", () =>
        syncEventCountersFromDb(event.id)
      );
      await runBestEffort("Socket capacity update", () =>
        emitCapacityUpdated(event.id)
      );

      return result;
    }
  );
}

async function runNoShowWorker() {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000);
  const events = await prisma.event.findMany({
    where: {
      status: "LIVE",
      startTime: {
        lte: cutoff,
      },
    },
    select: {
      id: true,
    },
  });

  logger.info({ eventCount: events.length }, "No-show worker found live events to process");

  for (const event of events) {
    const result = await processEvent(event);
    logger.info({
      eventId: event.id,
      released: result.released.length,
      promoted: result.promoted.length,
    }, "No-show worker processed event");
  }
}

if (require.main === module) {
  runNoShowWorker()
    .catch((error) => {
      logger.error({ error }, "No-show worker failed");
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await redis.quit();
      } catch (error) {
        // Redis may not have connected during an empty run.
      }
      await prisma.$disconnect();
    });
}

module.exports = {
  processEvent,
  runNoShowWorker,
};
