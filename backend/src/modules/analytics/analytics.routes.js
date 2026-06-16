const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const analyticsController = require("./analytics.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("ORGANIZER", "ADMIN"));

router.get("/events/:id", analyticsController.getEventAnalytics);
router.get("/venues", analyticsController.getVenueAnalytics);
router.get("/checkins", analyticsController.getCheckinAnalytics);

module.exports = router;
