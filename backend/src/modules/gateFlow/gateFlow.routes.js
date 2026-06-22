const express = require("express");

const { ACTIONS, SUBJECTS } = require("../../authorization/ability");
const { requireAbility } = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const gateFlowController = require("./gateFlow.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({ mergeParams: true });

router.get("/recommendation", validateRequest(schemas.events.id), gateFlowController.getGateRecommendation);
router.get(
  "/flow",
  requireAbility(ACTIONS.READ, SUBJECTS.GATE_FLOW),
  validateRequest(schemas.events.id),
  gateFlowController.getGateFlow
);

module.exports = router;
