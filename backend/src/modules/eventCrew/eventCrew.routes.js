const express = require("express");

const { ACTIONS, SUBJECTS } = require("../../authorization/ability");
const { idempotencyMiddleware } = require("../../middleware/idempotency.middleware");
const { requireAbility } = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const eventCrewController = require("./eventCrew.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.post("/", requireAbility(ACTIONS.ACCESS, SUBJECTS.EVENT_CREW_ACCESS), validateRequest(schemas.crew.create), idempotencyMiddleware(), eventCrewController.createCrewAccess);
router.get(
  "/",
  requireAbility(ACTIONS.ACCESS, SUBJECTS.EVENT_CREW_ACCESS),
  validateRequest(schemas.crew.id),
  eventCrewController.listCrewAccess
);
router.get("/me", validateRequest(schemas.crew.id), eventCrewController.getMyCrewAccess);
router.patch("/:crewAccessId", requireAbility(ACTIONS.ACCESS, SUBJECTS.EVENT_CREW_ACCESS), validateRequest(schemas.crew.update), idempotencyMiddleware(), eventCrewController.updateCrewAccess);
router.delete("/:crewAccessId", requireAbility(ACTIONS.ACCESS, SUBJECTS.EVENT_CREW_ACCESS), validateRequest(schemas.crew.accessId), idempotencyMiddleware(), eventCrewController.revokeCrewAccess);

module.exports = router;
