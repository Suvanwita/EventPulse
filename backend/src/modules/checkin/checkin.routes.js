const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { ACTIONS, SUBJECTS } = require("../../authorization/ability");
const { requireAbility } = require("../../middleware/role.middleware");
const checkinController = require("./checkin.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.post(
  "/scan",
  authMiddleware,
  requireAbility(ACTIONS.SCAN, SUBJECTS.CHECK_IN),
  validateRequest(schemas.checkin.scan),
  checkinController.scanQrToken
);

router.post(
  "/special-entry",
  authMiddleware,
  requireAbility(ACTIONS.SCAN, SUBJECTS.CHECK_IN),
  validateRequest(schemas.checkin.specialEntry),
  checkinController.specialEntry
);

router.get(
  "/",
  authMiddleware,
  requireAbility(ACTIONS.ACCESS, SUBJECTS.CHECK_IN),
  validateRequest(schemas.events.id),
  checkinController.listEventCheckIns
);

module.exports = router;
