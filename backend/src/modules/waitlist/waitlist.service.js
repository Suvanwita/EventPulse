const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const registrationService = require("../registrations/registration.service");

async function getWaitlist(eventId, user) {
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

  if (!["ORGANIZER", "ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Forbidden");
  }

  if (user.role !== "ADMIN" && event.createdById !== user.id) {
    throw new ApiError(403, "Forbidden");
  }

  return prisma.waitlistEntry.findMany({
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
    },
    orderBy: {
      position: "asc",
    },
  });
}

async function promoteNext(eventId, user) {
  if (!["ORGANIZER", "ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Forbidden");
  }

  return registrationService.promoteNext(eventId, user);
}

module.exports = {
  getWaitlist,
  promoteNext,
};
