const express = require("express");

const { requireRole } = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const gateFlowController = require("./gateFlow.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({ mergeParams: true });

router.get("/recommendation", validateRequest(schemas.events.id), gateFlowController.getGateRecommendation);
router.get(
  "/flow",
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  validateRequest(schemas.events.id),
  gateFlowController.getGateFlow
);

module.exports = router;
