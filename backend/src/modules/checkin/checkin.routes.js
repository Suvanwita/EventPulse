const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const checkinController = require("./checkin.controller");

const router = express.Router({
  mergeParams: true,
});

router.post(
  "/scan",
  authMiddleware,
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  checkinController.scanQrToken
);

router.get(
  "/",
  authMiddleware,
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  checkinController.listEventCheckIns
);

module.exports = router;
