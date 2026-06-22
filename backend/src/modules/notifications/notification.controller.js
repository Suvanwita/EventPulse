const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const notificationService = require("./notification.service");

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listNotifications(req.user, req.query);

  return response.success(res, 200, "Notifications fetched", {
    notifications,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await notificationService.getUnreadCount(req.user);

  return response.success(res, 200, "Unread notification count fetched", {
    unreadCount,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationRead(req.params.id, req.user);

  return response.success(res, 200, "Notification marked as read", {
    notification,
  });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user);

  return response.success(res, 200, "Notifications marked as read", result);
});

module.exports = {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markNotificationRead,
};
