const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { ACTIONS, SUBJECTS } = require("../../authorization/ability");
const { requireAbility } = require("../../middleware/role.middleware");
const venueController = require("./venue.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireAbility(ACTIONS.MANAGE, SUBJECTS.VENUE), validateRequest(schemas.venues.create), venueController.createVenue);
router.get("/", venueController.listVenues);
router.get("/:id", validateRequest(schemas.venues.id), venueController.getVenue);
router.patch("/:id", requireAbility(ACTIONS.MANAGE, SUBJECTS.VENUE), validateRequest(schemas.venues.update), venueController.updateVenue);
router.delete("/:id", requireAbility(ACTIONS.MANAGE, SUBJECTS.VENUE), validateRequest(schemas.venues.id), venueController.deleteVenue);
router.get(
  "/:id/schedule",
  requireAbility(ACTIONS.READ, SUBJECTS.VENUE_SCHEDULE),
  validateRequest(schemas.venues.id),
  venueController.getVenueSchedule
);

module.exports = router;
