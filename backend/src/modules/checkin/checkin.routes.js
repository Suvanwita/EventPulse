const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const checkinController = require("./checkin.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.post(
  "/scan",
  authMiddleware,
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  validateRequest(schemas.checkin.scan),
  checkinController.scanQrToken
);

router.post(
  "/special-entry",
  authMiddleware,
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  validateRequest(schemas.checkin.specialEntry),
  checkinController.specialEntry
);

router.get(
  "/",
  authMiddleware,
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  validateRequest(schemas.events.id),
  checkinController.listEventCheckIns
);

module.exports = router;
