const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const eventRoutes = require("../modules/events/event.routes");
const venueRoutes = require("../modules/venues/venue.routes");
const response = require("../utils/response");

const router = express.Router();

router.use("/api/auth", authRoutes);
router.use("/api/events", eventRoutes);
router.use("/api/venues", venueRoutes);

router.get("/health", (req, res) => {
  return response.success(res, 200, "EventPulse backend running");
});

module.exports = router;
