const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const { incrementCheckedIn } = require("../../utils/eventCounters");
const {
  publishCrewSpecialEntryUsed,
  publishCheckinCompleted,
  publishScanFailed,
} = require("../../utils/eventProducer");
const { checkRateLimit } = require("../../utils/rateLimiter");
const { withRedisLock } = require("../../utils/redisLock");
const { hashQrToken, verifyQrToken } = require("../../utils/qrToken");
const safeUser = require("../../utils/safeUser");
const {
  emitCapacityUpdated,
  emitCheckinUpdated,
  emitEntryRateUpdated,
  emitSpecialEntryUsed,
} = require("../../utils/socketEmitter");
const { createNotification } = require("../notifications/notification.service");

const SCAN_LOCK_TTL_MS = 10_000;
const SCAN_RATE_LIMIT = 30;
const SCAN_RATE_WINDOW_SECONDS = 60;

function validateScanInput(body) {
  const qrToken = typeof body.qrToken === "string" ? body.qrToken.trim() : "";
  const gateName =
    typeof body.gateName === "string" ? body.gateName.trim() : "";

  if (!qrToken) {
    throw new ApiError(400, "qrToken is required");
  }

  if (!gateName) {
    throw new ApiError(400, "gateName is required");
  }

  return {
    qrToken,
    gateName,
  };
}

function decodeQrTokenUnsafe(token) {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function buildCrewScanFields(crewAccess, scannedGate) {
  if (!crewAccess) {
    return {
      specialEntry: false,
    };
  }

  return {
    specialEntry: true,
    accessType: crewAccess.accessType,
    assignedGate: crewAccess.gateName,
    scannedGate,
    gateMatched: crewAccess.gateName === scannedGate,
    note: crewAccess.note,
    crewAccessId: crewAccess.id,
  };
}

async function getActiveCrewAccess(tx, eventId, userId) {
  return tx.eventCrewAccess.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
    include: {
      user: true,
    },
  }).then((access) => (access?.isActive ? access : null));
}

async function runBestEffort(label, operation) {
  try {
    return await operation();
  } catch (error) {
    console.error(`${label} failed:`, error);
    return null;
  }
}

async function recordRejectedScan({ eventId, userId, registrationId, scanner, reason, metadata = {} }) {
  if (eventId) {
    await runBestEffort("Check-in rejection log", () =>
      prisma.eventLog.create({
        data: {
          eventId,
          type: "CHECKIN_REJECTED",
          message: reason,
          metadata: {
            scannerId: scanner.id,
            userId: userId || null,
            registrationId: registrationId || null,
            ...metadata,
          },
        },
      })
    );
  }

  await publishScanFailed({
    eventId,
    userId,
    registrationId,
    metadata: {
      scannerId: scanner.id,
      reason,
      ...metadata,
    },
  });
}

async function rejectScan(context, statusCode, reason) {
  await recordRejectedScan({
    ...context,
    reason,
  });

  throw new ApiError(statusCode, reason);
}

async function scanQrToken(body, scanner) {
  const { qrToken, gateName } = validateScanInput(body);
  const unsafePayload = decodeQrTokenUnsafe(qrToken);

  try {
    await checkRateLimit(
      `scan:volunteer:${scanner.id}`,
      SCAN_RATE_LIMIT,
      SCAN_RATE_WINDOW_SECONDS
    );
  } catch (error) {
    await rejectScan(
      {
        eventId: unsafePayload?.eventId,
        userId: unsafePayload?.userId,
        registrationId: unsafePayload?.registrationId,
        scanner,
      },
      error.statusCode || 429,
      error.message || "Rate limit exceeded"
    );
  }

  const tokenHash = hashQrToken(qrToken);

  let payload;

  try {
    payload = verifyQrToken(qrToken);
  } catch (error) {
    await rejectScan(
      {
        eventId: unsafePayload?.eventId,
        userId: unsafePayload?.userId,
        registrationId: unsafePayload?.registrationId,
        scanner,
        metadata: {
          tokenHash,
        },
      },
      error.statusCode || 401,
      error.message || "Invalid QR token"
    );
  }

  const result = await withRedisLock(
    `lock:qr:${tokenHash}:scan`,
    SCAN_LOCK_TTL_MS,
    async () => {
      try {
        return await prisma.$transaction(async (tx) => {
          const registration = await tx.registration.findFirst({
            where: {
              qrTokenHash: tokenHash,
            },
            include: {
              event: true,
              user: true,
            },
          });

          if (!registration) {
            if (!String(payload.registrationId || "").startsWith("crew:")) {
              await rejectScan(
                {
                  eventId: payload.eventId,
                  userId: payload.userId,
                  registrationId: payload.registrationId,
                  scanner,
                  metadata: {
                    tokenHash,
                  },
                },
                404,
                "Registration not found for QR token"
              );
            }

            const crewAccessId = String(payload.registrationId).slice("crew:".length);
            const crewAccess = await tx.eventCrewAccess.findFirst({
              where: {
                id: crewAccessId,
                eventId: payload.eventId,
                userId: payload.userId,
                isActive: true,
              },
              include: {
                event: true,
                user: true,
              },
            });

            if (!crewAccess) {
              await rejectScan(
                {
                  eventId: payload.eventId,
                  userId: payload.userId,
                  registrationId: payload.registrationId,
                  scanner,
                  metadata: {
                    tokenHash,
                  },
                },
                404,
                "Active crew access not found for QR token"
              );
            }

            const existingSpecialEntry = await tx.checkIn.findFirst({
              where: {
                eventId: payload.eventId,
                userId: payload.userId,
                crewAccessId: crewAccess.id,
                specialEntryUsed: true,
              },
            });

            if (existingSpecialEntry) {
              await rejectScan(
                {
                  eventId: payload.eventId,
                  userId: payload.userId,
                  registrationId: null,
                  scanner,
                  metadata: {
                    crewAccessId: crewAccess.id,
                  },
                },
                409,
                "Duplicate special entry rejected"
              );
            }

            const scannedAt = new Date();
            const checkIn = await tx.checkIn.create({
              data: {
                eventId: payload.eventId,
                userId: payload.userId,
                scannedById: scanner.id,
                gateName,
                scannedAt,
                specialEntryUsed: true,
                crewAccessId: crewAccess.id,
                accessType: crewAccess.accessType,
              },
            });

            await tx.eventLog.create({
              data: {
                eventId: payload.eventId,
                type: "CREW_SPECIAL_ENTRY_USED",
                message: "Crew special entry used",
                metadata: {
                  checkInId: checkIn.id,
                  crewAccessId: crewAccess.id,
                  userId: payload.userId,
                  scannedById: scanner.id,
                  gateName,
                },
              },
            });

            return {
              checkIn,
              registration: null,
              event: crewAccess.event,
              student: crewAccess.user,
              crewAccess,
            };
          }

          if (
            registration.eventId !== payload.eventId ||
            registration.userId !== payload.userId ||
            registration.id !== payload.registrationId
          ) {
            await rejectScan(
              {
                eventId: payload.eventId || registration.eventId,
                userId: payload.userId,
                registrationId: payload.registrationId,
                scanner,
                metadata: {
                  tokenHash,
                  actualEventId: registration.eventId,
                  actualUserId: registration.userId,
                  actualRegistrationId: registration.id,
                },
              },
              400,
              "QR token does not match registration"
            );
          }

          if (registration.checkedInAt || registration.status === "CHECKED_IN") {
            await rejectScan(
              {
                eventId: registration.eventId,
                userId: registration.userId,
                registrationId: registration.id,
                scanner,
                metadata: {
                  tokenHash,
                },
              },
              409,
              "Duplicate check-in rejected"
            );
          }

          if (registration.status !== "CONFIRMED") {
            await rejectScan(
              {
                eventId: registration.eventId,
                userId: registration.userId,
                registrationId: registration.id,
                scanner,
                metadata: {
                  tokenHash,
                  registrationStatus: registration.status,
                },
              },
              400,
              "Registration is not confirmed"
            );
          }

          const crewAccess = await getActiveCrewAccess(
            tx,
            registration.eventId,
            registration.userId
          );
          const scannedAt = new Date();
          const checkIn = await tx.checkIn.create({
            data: {
              eventId: registration.eventId,
              userId: registration.userId,
              registrationId: registration.id,
              scannedById: scanner.id,
              gateName,
              scannedAt,
              specialEntryUsed: Boolean(crewAccess),
              crewAccessId: crewAccess?.id || null,
              accessType: crewAccess?.accessType || null,
            },
          });

          const updatedRegistration = await tx.registration.update({
            where: {
              id: registration.id,
            },
            data: {
              status: "CHECKED_IN",
              checkedInAt: scannedAt,
            },
          });

          await tx.eventLog.create({
            data: {
              eventId: registration.eventId,
              type: "CHECKIN_SUCCESS",
              message: "Check-in completed",
              metadata: {
                checkInId: checkIn.id,
                registrationId: registration.id,
                userId: registration.userId,
                scannedById: scanner.id,
                gateName,
              },
            },
          });

          return {
            checkIn,
            registration: updatedRegistration,
            event: registration.event,
            student: registration.user,
            crewAccess,
          };
        });
      } catch (error) {
        if (error.code === "P2002") {
          await rejectScan(
            {
              eventId: payload.eventId,
              userId: payload.userId,
              registrationId: payload.registrationId,
              scanner,
              metadata: {
                tokenHash,
              },
            },
            409,
            "Duplicate check-in rejected"
          );
        }

        throw error;
      }
    }
  );

  await runBestEffort("Redis checked-in counter increment", () =>
    incrementCheckedIn(result.checkIn.eventId)
  );
  await runBestEffort("Socket capacity update", () =>
    emitCapacityUpdated(result.checkIn.eventId)
  );
  emitCheckinUpdated(result.checkIn.eventId, {
    action: "completed",
    checkIn: result.checkIn,
    registrationId: result.registration?.id || null,
    userId: result.checkIn.userId,
  });
  await runBestEffort("Socket entry rate update", () =>
    emitEntryRateUpdated(result.checkIn.eventId)
  );
  await publishCheckinCompleted({
    eventId: result.checkIn.eventId,
    userId: result.checkIn.userId,
    registrationId: result.registration?.id || null,
    metadata: {
      checkInId: result.checkIn.id,
      scannedById: scanner.id,
      gateName,
    },
  });
  await runBestEffort("Notification create", () =>
    createNotification({
      userId: result.checkIn.userId,
      eventId: result.checkIn.eventId,
      type: "CHECKIN_COMPLETED",
      title: "Checked in",
      message: `You were checked in for ${result.event.title} at ${gateName}.`,
      actionUrl: `/events/${result.checkIn.eventId}`,
      metadata: {
        checkInId: result.checkIn.id,
        registrationId: result.registration?.id || null,
        scannedById: scanner.id,
        gateName,
      },
    })
  );

  const crewScanFields = buildCrewScanFields(result.crewAccess, gateName);

  if (crewScanFields.specialEntry) {
    emitSpecialEntryUsed(result.checkIn.eventId, {
      userId: result.checkIn.userId,
      studentName: result.student?.name,
      accessType: result.crewAccess.accessType,
      gateName,
      note: result.crewAccess.note,
    });
    await publishCrewSpecialEntryUsed({
      eventId: result.checkIn.eventId,
      userId: result.checkIn.userId,
      registrationId: result.registration?.id || null,
      metadata: {
        checkInId: result.checkIn.id,
        crewAccessId: result.crewAccess.id,
        gateName,
        gateMatched: crewScanFields.gateMatched,
      },
    });
  }

  const registration = result.registration
    ? (({ qrTokenHash, ...safeRegistration }) => safeRegistration)(result.registration)
    : null;
  const crewAccess = result.crewAccess
    ? {
        id: result.crewAccess.id,
        accessType: result.crewAccess.accessType,
        gateName: result.crewAccess.gateName,
        note: result.crewAccess.note,
      }
    : null;

  return {
    checkIn: result.checkIn,
    event: result.event,
    registration,
    student: safeUser(result.student),
    crewAccess,
    ...crewScanFields,
  };
}

async function specialEntry(body, scanner) {
  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const gateName = typeof body.gateName === "string" ? body.gateName.trim() : "";

  if (!eventId || !userId || !gateName) {
    throw new ApiError(400, "eventId, userId, and gateName are required");
  }

  const result = await prisma.$transaction(async (tx) => {
    const crewAccess = await tx.eventCrewAccess.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      include: {
        event: true,
        user: true,
      },
    });

    if (!crewAccess || !crewAccess.isActive) {
      throw new ApiError(404, "Active crew access not found");
    }

    const existingSpecialEntry = await tx.checkIn.findFirst({
      where: {
        eventId,
        userId,
        crewAccessId: crewAccess.id,
        specialEntryUsed: true,
      },
    });

    if (existingSpecialEntry) {
      throw new ApiError(409, "Duplicate special entry rejected");
    }

    const checkIn = await tx.checkIn.create({
      data: {
        eventId,
        userId,
        scannedById: scanner.id,
        gateName,
        specialEntryUsed: true,
        crewAccessId: crewAccess.id,
        accessType: crewAccess.accessType,
      },
    });

    await tx.eventLog.create({
      data: {
        eventId,
        type: "CREW_SPECIAL_ENTRY_USED",
        message: "Crew special entry used",
        metadata: {
          checkInId: checkIn.id,
          crewAccessId: crewAccess.id,
          userId,
          scannedById: scanner.id,
          gateName,
          manual: true,
        },
      },
    });

    return {
      checkIn,
      event: crewAccess.event,
      student: crewAccess.user,
      crewAccess,
    };
  });

  const crewScanFields = buildCrewScanFields(result.crewAccess, gateName);
  emitSpecialEntryUsed(eventId, {
    userId,
    studentName: result.student?.name,
    accessType: result.crewAccess.accessType,
    gateName,
    note: result.crewAccess.note,
  });
  await publishCrewSpecialEntryUsed({
    eventId,
    userId,
    metadata: {
      checkInId: result.checkIn.id,
      crewAccessId: result.crewAccess.id,
      gateName,
      gateMatched: crewScanFields.gateMatched,
      manual: true,
    },
  });
  await runBestEffort("Notification create", () =>
    createNotification({
      userId,
      eventId,
      type: "CHECKIN_COMPLETED",
      title: "Special entry recorded",
      message: `Your special entry for ${result.event.title} was recorded at ${gateName}.`,
      actionUrl: `/events/${eventId}`,
      metadata: {
        checkInId: result.checkIn.id,
        crewAccessId: result.crewAccess.id,
        gateName,
        manual: true,
      },
    })
  );

  return {
    checkIn: result.checkIn,
    event: result.event,
    student: safeUser(result.student),
    crewAccess: {
      id: result.crewAccess.id,
      accessType: result.crewAccess.accessType,
      gateName: result.crewAccess.gateName,
      note: result.crewAccess.note,
    },
    ...crewScanFields,
  };
}

async function listEventCheckIns(eventId, user) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (
    user.role === "ORGANIZER" &&
    event.createdById !== user.id
  ) {
    throw new ApiError(403, "Forbidden");
  }

  return prisma.checkIn.findMany({
    where: {
      eventId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      scannedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      registration: {
        select: {
          id: true,
          status: true,
          seatNumber: true,
          checkedInAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      scannedAt: "desc",
    },
  });
}

module.exports = {
  specialEntry,
  scanQrToken,
  listEventCheckIns,
};
