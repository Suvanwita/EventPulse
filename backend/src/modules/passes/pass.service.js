const QRCode = require("qrcode");

const prisma = require("../../config/prisma");
const { ACTIONS, SUBJECTS, asSubject, authorize, can } = require("../../authorization/ability");
const ApiError = require("../../utils/ApiError");
const safeUser = require("../../utils/safeUser");
const {
  generateQrPayload,
  generateQrToken,
  hashQrToken,
} = require("../../utils/qrToken");

function canFetchPassForRegistration(registration, user) {
  return can(user, ACTIONS.READ, asSubject(SUBJECTS.PASS, { userId: registration.userId }));
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
  const requestedUserId =
    ["ORGANIZER", "ADMIN"].includes(user.role) && options.userId
      ? options.userId
      : user.id;
  const registration = await findRegistration(eventId, user, options.userId);
  const crewAccess = await prisma.eventCrewAccess.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId: requestedUserId,
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
  const activeCrewAccess = crewAccess?.isActive ? crewAccess : null;

  if (!registration && !activeCrewAccess) {
    throw new ApiError(404, "Registration not found");
  }

  if (registration && !canFetchPassForRegistration(registration, user)) {
    authorize(user, ACTIONS.READ, asSubject(SUBJECTS.PASS, { userId: registration.userId }));
  }

  if (registration && !["CONFIRMED", "CHECKED_IN"].includes(registration.status) && !activeCrewAccess) {
    throw new ApiError(400, "Pass is only available for confirmed registrations");
  }

  const event = registration?.event || activeCrewAccess.event;
  const passUser = registration?.user || activeCrewAccess.user;
  const expiry = event.endTime.toISOString();
  const payload = generateQrPayload(
    eventId,
    passUser.id,
    registration?.id || `crew:${activeCrewAccess.id}`,
    expiry
  );
  const qrToken = generateQrToken(payload);
  const qrTokenHash = hashQrToken(qrToken);

  if (registration && registration.qrTokenHash !== qrTokenHash) {
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
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      status: event.status,
    },
    venue: event.venue,
    student: safeUser(passUser),
    registrationStatus: registration?.status || "SPECIAL_ENTRY",
    seatNumber: registration?.seatNumber || null,
    qrToken,
    qrImage,
    expiry,
    passType: activeCrewAccess ? "SPECIAL_ENTRY" : "ATTENDEE",
    specialEntryAllowed: Boolean(activeCrewAccess),
    crewAccess: activeCrewAccess
      ? {
          id: activeCrewAccess.id,
          accessType: activeCrewAccess.accessType,
          gateName: activeCrewAccess.gateName,
          note: activeCrewAccess.note,
        }
      : null,
  };
}

module.exports = {
  getEventPass,
};
