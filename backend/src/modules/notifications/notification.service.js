const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const { emitNotificationCreated, emitNotificationRead } = require("../../utils/socketEmitter");

function serializeNotification(notification) {
  return {
    ...notification,
    isRead: Boolean(notification.readAt),
  };
}

async function createNotification({
  userId,
  eventId = null,
  type = "SYSTEM",
  title,
  message,
  actionUrl = null,
  metadata = {},
}) {
  if (!userId || !title || !message) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      eventId,
      type,
      title,
      message,
      actionUrl,
      metadata,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  const unreadCount = await getUnreadCount({ id: userId });
  emitNotificationCreated(userId, {
    notification: serializeNotification(notification),
    unreadCount,
  });

  return notification;
}

async function listNotifications(user, query = {}) {
  const take = Math.min(Math.max(Number(query.limit) || 30, 1), 100);
  const onlyUnread = String(query.unread || "").toLowerCase() === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(onlyUnread ? { readAt: null } : {}),
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
  });

  return notifications.map(serializeNotification);
}

async function getUnreadCount(user) {
  return prisma.notification.count({
    where: {
      userId: user.id,
      readAt: null,
    },
  });
}

async function markNotificationRead(notificationId, user) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: user.id,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  const updated = await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      readAt: notification.readAt || new Date(),
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  const unreadCount = await getUnreadCount(user);
  emitNotificationRead(user.id, {
    notificationId,
    unreadCount,
  });

  return serializeNotification(updated);
}

async function markAllRead(user) {
  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  emitNotificationRead(user.id, {
    notificationId: null,
    unreadCount: 0,
  });

  return {
    updatedCount: result.count,
    unreadCount: 0,
  };
}

module.exports = {
  createNotification,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markNotificationRead,
};
