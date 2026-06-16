const prisma = require("../../config/prisma");
const redis = require("../../config/redis");
const ApiError = require("../../utils/ApiError");
const safeUser = require("../../utils/safeUser");
const {
  publishCrewAccessGranted,
  publishCrewAccessRevoked,
  publishCrewAccessUpdated,
} = require("../../utils/eventProducer");
const {
  emitCrewAccessUpdated,
} = require("../../utils/socketEmitter");

async function runBestEffort(label, operation) {
  try {
    return await operation();
  } catch (error) {
    console.error(`${label} failed:`, error);
    return null;
  }
}

async function getEventOrThrow(eventId) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
}

function canManageEventCrew(event, user) {
  return user.role === "ADMIN" || user.role === "ORGANIZER" || event.createdById === user.id;
}

async function assertCanManage(eventId, user) {
  const event = await getEventOrThrow(eventId);

  if (!canManageEventCrew(event, user)) {
    throw new ApiError(403, "Forbidden");
  }

  return event;
}

function serializeCrewAccess(access) {
  if (!access) {
    return null;
  }

  return {
    ...access,
    user: access.user ? safeUser(access.user) : undefined,
    assignedBy: access.assignedBy ? safeUser(access.assignedBy) : undefined,
  };
}

async function createCrewAccess(eventId, data, assignedBy) {
  await assertCanManage(eventId, assignedBy);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          id: data.userId,
        },
        {
          email: data.userId,
        },
      ],
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existing = await prisma.eventCrewAccess.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId: user.id,
      },
    },
  });

  const normalizedData = {
    ...data,
    userId: user.id,
  };

  if (existing && existing.isActive) {
    throw new ApiError(409, "Crew access already exists for this user and event");
  }

  const access = await prisma.$transaction(async (tx) => {
    const crewAccess = existing
      ? await tx.eventCrewAccess.update({
          where: {
            id: existing.id,
          },
          data: {
            ...normalizedData,
            assignedById: assignedBy.id,
            isActive: true,
          },
          include: {
            user: true,
            assignedBy: true,
          },
        })
      : await tx.eventCrewAccess.create({
          data: {
            ...normalizedData,
            eventId,
            assignedById: assignedBy.id,
          },
          include: {
            user: true,
            assignedBy: true,
          },
        });

    await tx.eventLog.create({
      data: {
        eventId,
        type: "CREW_ACCESS_GRANTED",
        message: "Crew access granted",
        metadata: {
          crewAccessId: crewAccess.id,
          userId: crewAccess.userId,
          assignedById: assignedBy.id,
          accessType: crewAccess.accessType,
          gateName: crewAccess.gateName,
        },
      },
    });

    return crewAccess;
  });

  await runBestEffort("Redis crew counter increment", () =>
    redis.incr(`event:${eventId}:crewCount`)
  );
  emitCrewAccessUpdated(eventId, {
    action: "granted",
    userId: access.userId,
    studentName: access.user?.name,
    accessType: access.accessType,
    gateName: access.gateName,
    note: access.note,
  });
  await publishCrewAccessGranted({
    eventId,
    userId: access.userId,
    metadata: {
      crewAccessId: access.id,
      accessType: access.accessType,
      gateName: access.gateName,
    },
  });

  return serializeCrewAccess(access);
}

async function listCrewAccess(eventId, user) {
  const event = await getEventOrThrow(eventId);

  if (
    !["VOLUNTEER", "ORGANIZER", "ADMIN"].includes(user.role) &&
    event.createdById !== user.id
  ) {
    throw new ApiError(403, "Forbidden");
  }

  const access = await prisma.eventCrewAccess.findMany({
    where: {
      eventId,
    },
    include: {
      user: true,
      assignedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return access.map(serializeCrewAccess);
}

async function getMyCrewAccess(eventId, user) {
  await getEventOrThrow(eventId);

  const access = await prisma.eventCrewAccess.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId: user.id,
      },
    },
    include: {
      user: true,
      assignedBy: true,
    },
  });

  return serializeCrewAccess(access);
}

async function updateCrewAccess(eventId, crewAccessId, data, user) {
  await assertCanManage(eventId, user);

  const existing = await prisma.eventCrewAccess.findFirst({
    where: {
      id: crewAccessId,
      eventId,
    },
    include: {
      user: true,
      assignedBy: true,
    },
  });

  if (!existing) {
    throw new ApiError(404, "Crew access not found");
  }

  const access = await prisma.$transaction(async (tx) => {
    const updated = await tx.eventCrewAccess.update({
      where: {
        id: crewAccessId,
      },
      data,
      include: {
        user: true,
        assignedBy: true,
      },
    });

    await tx.eventLog.create({
      data: {
        eventId,
        type: "CREW_ACCESS_UPDATED",
        message: "Crew access updated",
        metadata: {
          crewAccessId,
          userId: updated.userId,
          updatedById: user.id,
          data,
        },
      },
    });

    return updated;
  });

  emitCrewAccessUpdated(eventId, {
    action: "updated",
    userId: access.userId,
    studentName: access.user?.name,
    accessType: access.accessType,
    gateName: access.gateName,
    note: access.note,
  });
  await publishCrewAccessUpdated({
    eventId,
    userId: access.userId,
    metadata: {
      crewAccessId: access.id,
      data,
    },
  });

  return serializeCrewAccess(access);
}

async function revokeCrewAccess(eventId, crewAccessId, user) {
  await assertCanManage(eventId, user);

  const access = await updateCrewAccess(
    eventId,
    crewAccessId,
    {
      isActive: false,
    },
    user
  );

  await prisma.eventLog.create({
    data: {
      eventId,
      type: "CREW_ACCESS_REVOKED",
      message: "Crew access revoked",
      metadata: {
        crewAccessId,
        userId: access.userId,
        revokedById: user.id,
      },
    },
  });

  await runBestEffort("Redis crew counter decrement", () =>
    redis.decr(`event:${eventId}:crewCount`)
  );
  emitCrewAccessUpdated(eventId, {
    action: "revoked",
    userId: access.userId,
    studentName: access.user?.name,
    accessType: access.accessType,
    gateName: access.gateName,
    note: access.note,
  });
  await publishCrewAccessRevoked({
    eventId,
    userId: access.userId,
    metadata: {
      crewAccessId,
    },
  });

  return access;
}

module.exports = {
  createCrewAccess,
  getMyCrewAccess,
  listCrewAccess,
  revokeCrewAccess,
  updateCrewAccess,
};
