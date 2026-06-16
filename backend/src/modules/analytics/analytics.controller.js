const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const analyticsService = require("./analytics.service");

const getEventAnalytics = asyncHandler(async (req, res) => {
  await analyticsService.assertEventAnalyticsAccess(req.params.id, req.user);
  const analytics = await analyticsService.getEventAnalytics(req.params.id);

  return response.success(res, 200, "Event analytics fetched", analytics);
});

const getEventTimeRangeAnalytics = asyncHandler(async (req, res) => {
  await analyticsService.assertEventAnalyticsAccess(req.params.id, req.user);
  const analytics = await analyticsService.getEventTimeRangeAnalytics(
    req.params.id,
    req.query
  );

  return response.success(res, 200, "Time-range analytics fetched", analytics);
});

const getVenueAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getVenueAnalytics();

  return response.success(res, 200, "Venue analytics fetched", {
    venues: analytics,
  });
});

const getCheckinAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getCheckinAnalytics();

  return response.success(res, 200, "Check-in analytics fetched", analytics);
});

module.exports = {
  getEventAnalytics,
  getEventTimeRangeAnalytics,
  getVenueAnalytics,
  getCheckinAnalytics,
};
