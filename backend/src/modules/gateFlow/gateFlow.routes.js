const express = require("express");

const { requireRole } = require("../../middleware/role.middleware");
const gateFlowController = require("./gateFlow.controller");

const router = express.Router({ mergeParams: true });

router.get("/recommendation", gateFlowController.getGateRecommendation);
router.get(
  "/flow",
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  gateFlowController.getGateFlow
);

module.exports = router;

