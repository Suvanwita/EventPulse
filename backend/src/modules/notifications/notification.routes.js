const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const { idempotencyMiddleware } = require("../../middleware/idempotency.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const notificationController = require("./notification.controller");
const { rateLimiters } = require("../../utils/rateLimiter");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.use(authMiddleware);

router.get("/", validateRequest(schemas.notifications.list), notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", rateLimiters.notificationMutation, idempotencyMiddleware(), notificationController.markAllRead);
router.patch("/:id/read", rateLimiters.notificationMutation, validateRequest(schemas.notifications.id), idempotencyMiddleware(), notificationController.markNotificationRead);

module.exports = router;
