const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const analyticsController = require("./analytics.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("ORGANIZER", "ADMIN"));

router.get("/events/:id/time-range", validateRequest(schemas.analytics.eventTimeRange), analyticsController.getEventTimeRangeAnalytics);
router.get("/events/:id", validateRequest(schemas.analytics.eventId), analyticsController.getEventAnalytics);
router.get("/venues", analyticsController.getVenueAnalytics);
router.get("/checkins", analyticsController.getCheckinAnalytics);

module.exports = router;
