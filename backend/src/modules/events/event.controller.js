const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const eventService = require("./event.service");
const {
  validateCreateEvent,
  validateUpdateEvent,
} = require("./event.validation");

const createEvent = asyncHandler(async (req, res) => {
  const input = validateCreateEvent(req.body);
  const event = await eventService.createEvent(input, req.user);

  return response.created(res, "Event created", {
    event,
  });
});

const listEvents = asyncHandler(async (req, res) => {
  const events = await eventService.listEvents(req.query, req.user);

  return response.success(res, 200, "Events fetched", {
    events,
  });
});

const getEvent = asyncHandler(async (req, res) => {
  const event = await eventService.getEventDetails(req.params.id);

  return response.success(res, 200, "Event fetched", {
    event,
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const input = validateUpdateEvent(req.body);
  const event = await eventService.updateEvent(req.params.id, input, req.user);

  return response.success(res, 200, "Event updated", {
    event,
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await eventService.deleteEvent(req.params.id, req.user);

  return response.success(res, 200, "Event deleted", {
    event,
  });
});

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
};
