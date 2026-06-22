const express = require("express");

const { requireRole } = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const eventCrewController = require("./eventCrew.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.post("/", validateRequest(schemas.crew.create), eventCrewController.createCrewAccess);
router.get(
  "/",
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  validateRequest(schemas.crew.id),
  eventCrewController.listCrewAccess
);
router.get("/me", validateRequest(schemas.crew.id), eventCrewController.getMyCrewAccess);
router.patch("/:crewAccessId", validateRequest(schemas.crew.update), eventCrewController.updateCrewAccess);
router.delete("/:crewAccessId", validateRequest(schemas.crew.accessId), eventCrewController.revokeCrewAccess);

module.exports = router;
