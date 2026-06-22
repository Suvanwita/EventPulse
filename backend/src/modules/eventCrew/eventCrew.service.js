const prisma = require("../../config/prisma");
const { ACTIONS, SUBJECTS, asSubject, authorize } = require("../../authorization/ability");
const redis = require("../../config/redis");
const { logger } = require("../../observability/logger");
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
const { createNotification } = require("../notifications/notification.service");

async function runBestEffort(label, operation) {
  try {
    return await operation();
  } catch (error) {
    logger.error({ error, label }, "Best-effort event crew operation failed");
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

async function assertCanManage(eventId, user) {
  const event = await getEventOrThrow(eventId);
  authorize(user, ACTIONS.MANAGE, asSubject(SUBJECTS.EVENT_CREW_ACCESS, event));

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
  const event = await assertCanManage(eventId, assignedBy);

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
  await runBestEffort("Notification create", () =>
    createNotification({
      userId: access.userId,
      eventId,
      type: "CREW_ACCESS_GRANTED",
      title: "Crew access granted",
      message: `You have ${access.accessType.replaceAll("_", " ").toLowerCase()} access for ${event.title} at ${access.gateName}.`,
      actionUrl: `/events/${eventId}`,
      metadata: {
        crewAccessId: access.id,
        accessType: access.accessType,
        gateName: access.gateName,
      },
    })
  );

  return serializeCrewAccess(access);
}

async function listCrewAccess(eventId, user) {
  const event = await getEventOrThrow(eventId);
  authorize(user, ACTIONS.READ, asSubject(SUBJECTS.EVENT_CREW_ACCESS, event));

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
  const event = await assertCanManage(eventId, user);

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
  if (data.isActive !== false) {
    await runBestEffort("Notification create", () =>
      createNotification({
        userId: access.userId,
        eventId,
        type: "CREW_ACCESS_UPDATED",
        title: "Crew access updated",
        message: `Your crew access for ${event.title} now uses ${access.gateName}.`,
        actionUrl: `/events/${eventId}`,
        metadata: {
          crewAccessId: access.id,
          accessType: access.accessType,
          gateName: access.gateName,
          data,
        },
      })
    );
  }

  return serializeCrewAccess(access);
}

async function revokeCrewAccess(eventId, crewAccessId, user) {
  const event = await assertCanManage(eventId, user);

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
  await runBestEffort("Notification create", () =>
    createNotification({
      userId: access.userId,
      eventId,
      type: "CREW_ACCESS_REVOKED",
      title: "Crew access revoked",
      message: `Your crew access for ${event.title} has been revoked.`,
      actionUrl: `/events/${eventId}`,
      metadata: {
        crewAccessId,
      },
    })
  );

  return access;
}

module.exports = {
  createCrewAccess,
  getMyCrewAccess,
  listCrewAccess,
  revokeCrewAccess,
  updateCrewAccess,
};
