const express = require("express");

const analyticsRoutes = require("../modules/analytics/analytics.routes");
const authRoutes = require("../modules/auth/auth.routes");
const checkinRoutes = require("../modules/checkin/checkin.routes");
const eventRoutes = require("../modules/events/event.routes");
const searchRoutes = require("../modules/search/search.routes");
const venueRoutes = require("../modules/venues/venue.routes");
const response = require("../utils/response");

const router = express.Router();

router.use("/api/analytics", analyticsRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/checkin", checkinRoutes);
router.use("/api/events", eventRoutes);
router.use("/api/search", searchRoutes);
router.use("/api/venues", venueRoutes);

router.get("/health", (req, res) => {
  return response.success(res, 200, "EventPulse backend running");
});

module.exports = router;
