const QRCode = require("qrcode");

const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const safeUser = require("../../utils/safeUser");
const {
  generateQrPayload,
  generateQrToken,
  hashQrToken,
} = require("../../utils/qrToken");

function canFetchPassForRegistration(registration, user) {
  if (user.role === "STUDENT") {
    return registration.userId === user.id;
  }

  return ["ORGANIZER", "ADMIN"].includes(user.role);
}

async function findRegistration(eventId, user, requestedUserId) {
  const userId =
    ["ORGANIZER", "ADMIN"].includes(user.role) && requestedUserId
      ? requestedUserId
      : user.id;

  return prisma.registration.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
    include: {
      event: {
        include: {
          venue: true,
        },
      },
      user: true,
    },
  });
}

async function getEventPass(eventId, user, options = {}) {
  const registration = await findRegistration(eventId, user, options.userId);

  if (!registration) {
    throw new ApiError(404, "Registration not found");
  }

  if (!canFetchPassForRegistration(registration, user)) {
    throw new ApiError(403, "Forbidden");
  }

  if (!["CONFIRMED", "CHECKED_IN"].includes(registration.status)) {
    throw new ApiError(400, "Pass is only available for confirmed registrations");
  }

  const expiry = registration.event.endTime.toISOString();
  const payload = generateQrPayload(
    eventId,
    registration.userId,
    registration.id,
    expiry
  );
  const qrToken = generateQrToken(payload);
  const qrTokenHash = hashQrToken(qrToken);

  if (registration.qrTokenHash !== qrTokenHash) {
    await prisma.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        qrTokenHash,
      },
    });
  }

  const qrImage = await QRCode.toDataURL(qrToken);

  return {
    event: {
      id: registration.event.id,
      title: registration.event.title,
      description: registration.event.description,
      startTime: registration.event.startTime,
      endTime: registration.event.endTime,
      status: registration.event.status,
    },
    venue: registration.event.venue,
    student: safeUser(registration.user),
    registrationStatus: registration.status,
    seatNumber: registration.seatNumber,
    qrToken,
    qrImage,
    expiry,
  };
}

module.exports = {
  getEventPass,
};
