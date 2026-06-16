const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const venueService = require("./venue.service");
const {
  validateCreateVenue,
  validateUpdateVenue,
} = require("./venue.validation");

const createVenue = asyncHandler(async (req, res) => {
  const input = validateCreateVenue(req.body);
  const venue = await venueService.createVenue(input);

  return response.created(res, "Venue created", {
    venue,
  });
});

const listVenues = asyncHandler(async (req, res) => {
  const venues = await venueService.listVenues();

  return response.success(res, 200, "Venues fetched", {
    venues,
  });
});

const getVenue = asyncHandler(async (req, res) => {
  const venue = await venueService.getVenueById(req.params.id);

  return response.success(res, 200, "Venue fetched", {
    venue,
  });
});

const updateVenue = asyncHandler(async (req, res) => {
  const input = validateUpdateVenue(req.body);
  const venue = await venueService.updateVenue(req.params.id, input);

  return response.success(res, 200, "Venue updated", {
    venue,
  });
});

const deleteVenue = asyncHandler(async (req, res) => {
  const venue = await venueService.deleteVenue(req.params.id);

  return response.success(res, 200, "Venue deleted", {
    venue,
  });
});

const getVenueSchedule = asyncHandler(async (req, res) => {
  const events = await venueService.getVenueSchedule(req.params.id);

  return response.success(res, 200, "Venue schedule fetched", {
    events,
  });
});

module.exports = {
  createVenue,
  listVenues,
  getVenue,
  updateVenue,
  deleteVenue,
  getVenueSchedule,
};
