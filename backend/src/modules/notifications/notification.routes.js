const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const notificationController = require("./notification.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", notificationController.markNotificationRead);

module.exports = router;
