const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const venueController = require("./venue.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRole("ADMIN"), validateRequest(schemas.venues.create), venueController.createVenue);
router.get("/", venueController.listVenues);
router.get("/:id", validateRequest(schemas.venues.id), venueController.getVenue);
router.patch("/:id", requireRole("ADMIN"), validateRequest(schemas.venues.update), venueController.updateVenue);
router.delete("/:id", requireRole("ADMIN"), validateRequest(schemas.venues.id), venueController.deleteVenue);
router.get(
  "/:id/schedule",
  requireRole("ORGANIZER", "ADMIN"),
  validateRequest(schemas.venues.id),
  venueController.getVenueSchedule
);

module.exports = router;
