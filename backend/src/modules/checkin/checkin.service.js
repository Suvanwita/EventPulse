const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const { incrementCheckedIn } = require("../../utils/eventCounters");
const {
  publishCheckinCompleted,
  publishScanFailed,
} = require("../../utils/eventProducer");
const { checkRateLimit } = require("../../utils/rateLimiter");
const { withRedisLock } = require("../../utils/redisLock");
const { hashQrToken, verifyQrToken } = require("../../utils/qrToken");
const safeUser = require("../../utils/safeUser");

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

          const scannedAt = new Date();
          const checkIn = await tx.checkIn.create({
            data: {
              eventId: registration.eventId,
              userId: registration.userId,
              registrationId: registration.id,
              scannedById: scanner.id,
              gateName,
              scannedAt,
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
    incrementCheckedIn(result.registration.eventId)
  );
  await publishCheckinCompleted({
    eventId: result.registration.eventId,
    userId: result.registration.userId,
    registrationId: result.registration.id,
    metadata: {
      checkInId: result.checkIn.id,
      scannedById: scanner.id,
      gateName,
    },
  });

  const { qrTokenHash, ...registration } = result.registration;

  return {
    ...result,
    registration,
    student: safeUser(result.student),
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
  scanQrToken,
  listEventCheckIns,
};
