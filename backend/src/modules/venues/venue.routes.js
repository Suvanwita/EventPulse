const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const venueController = require("./venue.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRole("ADMIN"), venueController.createVenue);
router.get("/", venueController.listVenues);
router.get("/:id", venueController.getVenue);
router.patch("/:id", requireRole("ADMIN"), venueController.updateVenue);
router.delete("/:id", requireRole("ADMIN"), venueController.deleteVenue);
router.get(
  "/:id/schedule",
  requireRole("ORGANIZER", "ADMIN"),
  venueController.getVenueSchedule
);

module.exports = router;
