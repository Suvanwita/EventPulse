const crypto = require("crypto");

const prisma = require("../../config/prisma");
const { getFirstAvailableSeat } = require("../../dsa/seatAllocator");
const ApiError = require("../../utils/ApiError");
const {
  decrementRegistered,
  decrementWaitlist,
  incrementRegistered,
  incrementWaitlist,
  syncEventCountersFromDb,
} = require("../../utils/eventCounters");
const {
  publishRegistrationCancelled,
  publishRegistrationCreated,
  publishWaitlistJoined,
  publishWaitlistPromoted,
} = require("../../utils/eventProducer");
const { withRedisLock } = require("../../utils/redisLock");
const {
  emitCapacityUpdated,
  emitRegistrationUpdated,
  emitWaitlistUpdated,
} = require("../../utils/socketEmitter");

const REGISTRATION_LOCK_TTL_MS = 10_000;

function getRegistrationLockKey(eventId) {
  return `lock:event:${eventId}:registration`;
}

function assertStudent(user) {
  if (user.role !== "STUDENT") {
    throw new ApiError(403, "Only students can register for events");
  }
}

function assertRegistrationWindow(event) {
  if (!["OPEN", "LIVE"].includes(event.status)) {
    throw new ApiError(400, "Event is not open for registration");
  }

  if (event.registrationDeadline < new Date()) {
    throw new ApiError(400, "Registration deadline has passed");
  }
}

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
    console.error(`${label} failed:`, error);
    return null;
  }
}

async function getEventForRegistration(tx, eventId) {
  const event = await tx.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      venue: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
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

async function promoteNextWaitlistEntry(tx, event, seatNumber) {
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
      message: "Waitlist entry promoted",
      metadata: {
        registrationId: registration.id,
        userId: waitlistEntry.userId,
        waitlistEntryId: waitlistEntry.id,
        seatNumber,
      },
    },
  });

  return {
    registration,
    waitlistEntry,
  };
}

async function registerForEvent(eventId, user) {
  assertStudent(user);

  return withRedisLock(
    getRegistrationLockKey(eventId),
    REGISTRATION_LOCK_TTL_MS,
    async () => {
      const result = await prisma.$transaction(async (tx) => {
        const event = await getEventForRegistration(tx, eventId);
        assertRegistrationWindow(event);

        const existingRegistration = await tx.registration.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId: user.id,
            },
          },
        });

        if (existingRegistration && existingRegistration.status !== "CANCELLED") {
          throw new ApiError(409, "You are already registered for this event");
        }

        const confirmedCount = await tx.registration.count({
          where: {
            eventId,
            status: {
              in: ["CONFIRMED", "CHECKED_IN"],
            },
          },
        });

        if (confirmedCount < event.capacity) {
          const occupiedSeats = await getOccupiedSeats(tx, eventId);
          const seatNumber = getFirstAvailableSeat(event.venue, occupiedSeats);

          if (!seatNumber) {
            throw new ApiError(409, "No seats are available");
          }

          const registration = existingRegistration
            ? await tx.registration.update({
                where: {
                  id: existingRegistration.id,
                },
                data: {
                  status: "CONFIRMED",
                  seatNumber,
                  qrTokenHash: createQrTokenHash(eventId, user.id),
                  checkedInAt: null,
                },
              })
            : await tx.registration.create({
                data: {
                  eventId,
                  userId: user.id,
                  status: "CONFIRMED",
                  seatNumber,
                  qrTokenHash: createQrTokenHash(eventId, user.id),
                },
              });

          await tx.eventLog.create({
            data: {
              eventId,
              type: "REGISTRATION_CREATED",
              message: "Registration created",
              metadata: {
                registrationId: registration.id,
                userId: user.id,
                seatNumber,
              },
            },
          });

          return {
            outcome: "CONFIRMED",
            registration,
          };
        }

        const waitlistCount = await tx.waitlistEntry.count({
          where: {
            eventId,
            status: "WAITING",
          },
        });

        if (waitlistCount >= event.waitlistCapacity) {
          throw new ApiError(409, "Event and waitlist are full");
        }

        const nextPosition =
          (
            await tx.waitlistEntry.aggregate({
              where: {
                eventId,
              },
              _max: {
                position: true,
              },
            })
          )._max.position || 0;

        const registration = existingRegistration
          ? await tx.registration.update({
              where: {
                id: existingRegistration.id,
              },
              data: {
                status: "WAITLISTED",
                seatNumber: null,
                qrTokenHash: null,
                checkedInAt: null,
              },
            })
          : await tx.registration.create({
              data: {
                eventId,
                userId: user.id,
                status: "WAITLISTED",
              },
            });

        const existingWaitlistEntry = await tx.waitlistEntry.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId: user.id,
            },
          },
        });

        const waitlistEntry = existingWaitlistEntry
          ? await tx.waitlistEntry.update({
              where: {
                id: existingWaitlistEntry.id,
              },
              data: {
                position: nextPosition + 1,
                status: "WAITING",
              },
            })
          : await tx.waitlistEntry.create({
              data: {
                eventId,
                userId: user.id,
                position: nextPosition + 1,
                status: "WAITING",
              },
            });

        await tx.eventLog.create({
          data: {
            eventId,
            type: "WAITLIST_JOINED",
            message: "User joined waitlist",
            metadata: {
              registrationId: registration.id,
              userId: user.id,
              waitlistEntryId: waitlistEntry.id,
              position: waitlistEntry.position,
            },
          },
        });

        return {
          outcome: "WAITLISTED",
          registration,
          waitlistEntry,
        };
      });

      if (result.outcome === "CONFIRMED") {
        await runBestEffort("Redis registered counter increment", () =>
          incrementRegistered(eventId)
        );
        await runBestEffort("Socket capacity update", () =>
          emitCapacityUpdated(eventId)
        );
        emitRegistrationUpdated(eventId, {
          action: "created",
          registration: result.registration,
        });
        await publishRegistrationCreated({
          eventId,
          userId: user.id,
          registrationId: result.registration.id,
          metadata: {
            seatNumber: result.registration.seatNumber,
          },
        });
      } else {
        await runBestEffort("Redis waitlist counter increment", () =>
          incrementWaitlist(eventId)
        );
        await runBestEffort("Socket capacity update", () =>
          emitCapacityUpdated(eventId)
        );
        emitWaitlistUpdated(eventId, {
          action: "joined",
          registration: result.registration,
          waitlistEntry: result.waitlistEntry,
        });
        await publishWaitlistJoined({
          eventId,
          userId: user.id,
          registrationId: result.registration.id,
          metadata: {
            waitlistEntryId: result.waitlistEntry.id,
            position: result.waitlistEntry.position,
          },
        });
      }

      return result;
    }
  );
}

async function cancelRegistration(eventId, user) {
  assertStudent(user);

  return withRedisLock(
    getRegistrationLockKey(eventId),
    REGISTRATION_LOCK_TTL_MS,
    async () => {
      const result = await prisma.$transaction(async (tx) => {
        const event = await getEventForRegistration(tx, eventId);
        const registration = await tx.registration.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId: user.id,
            },
          },
        });

        if (!registration || registration.status === "CANCELLED") {
          throw new ApiError(404, "Active registration not found");
        }

        if (registration.status === "WAITLISTED") {
          const cancelledRegistration = await tx.registration.update({
            where: {
              id: registration.id,
            },
            data: {
              status: "CANCELLED",
              seatNumber: null,
              qrTokenHash: null,
              checkedInAt: null,
            },
          });

          await tx.waitlistEntry.updateMany({
            where: {
              eventId,
              userId: user.id,
              status: "WAITING",
            },
            data: {
              status: "CANCELLED",
            },
          });

          await tx.eventLog.create({
            data: {
              eventId,
              type: "REGISTRATION_CANCELLED",
              message: "Waitlisted registration cancelled",
              metadata: {
                registrationId: registration.id,
                userId: user.id,
              },
            },
          });

          return {
            cancelledRegistration,
            promoted: null,
            wasWaitlisted: true,
          };
        }

        const freedSeat = registration.seatNumber;
        const cancelledRegistration = await tx.registration.update({
          where: {
            id: registration.id,
          },
          data: {
            status: "CANCELLED",
            seatNumber: null,
            qrTokenHash: null,
            checkedInAt: null,
          },
        });

        await tx.eventLog.create({
          data: {
            eventId,
            type: "REGISTRATION_CANCELLED",
            message: "Registration cancelled",
            metadata: {
              registrationId: registration.id,
              userId: user.id,
              freedSeat,
            },
          },
        });

        const promoted = freedSeat
          ? await promoteNextWaitlistEntry(tx, event, freedSeat)
          : null;

        return {
          cancelledRegistration,
          promoted,
          wasWaitlisted: false,
        };
      });

      if (result.wasWaitlisted) {
        await runBestEffort("Redis waitlist counter decrement", () =>
          decrementWaitlist(eventId)
        );
        emitWaitlistUpdated(eventId, {
          action: "cancelled",
          registration: result.cancelledRegistration,
        });
      } else {
        await runBestEffort("Redis registered counter decrement", () =>
          decrementRegistered(eventId)
        );
        emitRegistrationUpdated(eventId, {
          action: "cancelled",
          registration: result.cancelledRegistration,
        });

        if (result.promoted) {
          await runBestEffort("Redis waitlist counter decrement", () =>
            decrementWaitlist(eventId)
          );
          await runBestEffort("Redis registered counter increment", () =>
            incrementRegistered(eventId)
          );
          emitWaitlistUpdated(eventId, {
            action: "promoted",
            waitlistEntry: result.promoted.waitlistEntry,
          });
          emitRegistrationUpdated(eventId, {
            action: "promoted",
            registration: result.promoted.registration,
          });
          await publishWaitlistPromoted({
            eventId,
            userId: result.promoted.waitlistEntry.userId,
            registrationId: result.promoted.registration.id,
            metadata: {
              waitlistEntryId: result.promoted.waitlistEntry.id,
              seatNumber: result.promoted.registration.seatNumber,
            },
          });
        }
      }

      await runBestEffort("Socket capacity update", () =>
        emitCapacityUpdated(eventId)
      );

      await publishRegistrationCancelled({
        eventId,
        userId: user.id,
        registrationId: result.cancelledRegistration.id,
        metadata: {
          promotedRegistrationId: result.promoted?.registration.id || null,
        },
      });

      return result;
    }
  );
}

async function getRegistrationStatus(eventId, user) {
  const [event, registration, waitlistEntry] = await Promise.all([
    prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
      },
    }),
    prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
    }),
    prisma.waitlistEntry.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
    }),
  ]);

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return {
    registration,
    waitlistEntry,
  };
}

async function promoteNext(eventId, user) {
  return withRedisLock(
    getRegistrationLockKey(eventId),
    REGISTRATION_LOCK_TTL_MS,
    async () => {
      const result = await prisma.$transaction(async (tx) => {
        const event = await getEventForRegistration(tx, eventId);

        if (user.role !== "ADMIN" && event.createdById !== user.id) {
          throw new ApiError(403, "Forbidden");
        }

        const confirmedCount = await tx.registration.count({
          where: {
            eventId,
            status: {
              in: ["CONFIRMED", "CHECKED_IN"],
            },
          },
        });

        if (confirmedCount >= event.capacity) {
          throw new ApiError(409, "No seats are available for promotion");
        }

        const occupiedSeats = await getOccupiedSeats(tx, eventId);
        const seatNumber = getFirstAvailableSeat(event.venue, occupiedSeats);

        if (!seatNumber) {
          throw new ApiError(409, "No seats are available for promotion");
        }

        const promoted = await promoteNextWaitlistEntry(tx, event, seatNumber);

        if (!promoted) {
          throw new ApiError(404, "No waiting waitlist entries found");
        }

        return promoted;
      });

      await runBestEffort("Redis waitlist counter decrement", () =>
        decrementWaitlist(eventId)
      );
      await runBestEffort("Redis registered counter increment", () =>
        incrementRegistered(eventId)
      );
      emitWaitlistUpdated(eventId, {
        action: "promoted",
        waitlistEntry: result.waitlistEntry,
      });
      emitRegistrationUpdated(eventId, {
        action: "promoted",
        registration: result.registration,
      });
      await publishWaitlistPromoted({
        eventId,
        userId: result.waitlistEntry.userId,
        registrationId: result.registration.id,
        metadata: {
          waitlistEntryId: result.waitlistEntry.id,
          seatNumber: result.registration.seatNumber,
        },
      });
      await runBestEffort("Redis event counter sync", () =>
        syncEventCountersFromDb(eventId)
      );
      await runBestEffort("Socket capacity update", () =>
        emitCapacityUpdated(eventId)
      );

      return result;
    }
  );
}

module.exports = {
  cancelRegistration,
  getRegistrationStatus,
  getRegistrationLockKey,
  promoteNext,
  registerForEvent,
};
