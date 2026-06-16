const express = require("express");

const { requireRole } = require("../../middleware/role.middleware");
const eventCrewController = require("./eventCrew.controller");

const router = express.Router({
  mergeParams: true,
});

router.post("/", eventCrewController.createCrewAccess);
router.get(
  "/",
  requireRole("VOLUNTEER", "ORGANIZER", "ADMIN"),
  eventCrewController.listCrewAccess
);
router.get("/me", eventCrewController.getMyCrewAccess);
router.patch("/:crewAccessId", eventCrewController.updateCrewAccess);
router.delete("/:crewAccessId", eventCrewController.revokeCrewAccess);

module.exports = router;

