const ApiError = require("../../utils/ApiError");

const EVENT_STATUSES = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
];

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseDate(value, fieldName) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }

  return date;
}

function parseInteger(value, fieldName, options = {}) {
  const number = Number(value);
  const minimum = options.minimum ?? 1;

  if (!Number.isInteger(number) || number < minimum) {
    throw new ApiError(400, `${fieldName} must be greater than or equal to ${minimum}`);
  }

  return number;
}

function validateEventInput(body, options = {}) {
  const isPartial = options.partial === true;
  const data = {};

  if (!isPartial || hasOwn(body, "title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      throw new ApiError(400, "Title is required");
    }

    data.title = title;
  }

  if (!isPartial || hasOwn(body, "description")) {
    data.description =
      typeof body.description === "string" ? body.description.trim() : "";
  }

  if (!isPartial || hasOwn(body, "venueId")) {
    const venueId = typeof body.venueId === "string" ? body.venueId.trim() : "";

    if (!venueId) {
      throw new ApiError(400, "venueId is required");
    }

    data.venueId = venueId;
  }

  for (const fieldName of ["startTime", "endTime", "registrationDeadline"]) {
    if (!isPartial || hasOwn(body, fieldName)) {
      data[fieldName] = parseDate(body[fieldName], fieldName);
    }
  }

  if (!isPartial || hasOwn(body, "capacity")) {
    data.capacity = parseInteger(body.capacity, "capacity");
  }

  if (!isPartial || hasOwn(body, "waitlistCapacity")) {
    data.waitlistCapacity = parseInteger(body.waitlistCapacity, "waitlistCapacity", {
      minimum: 0,
    });
  }

  if (hasOwn(body, "status")) {
    if (!EVENT_STATUSES.includes(body.status)) {
      throw new ApiError(400, "Invalid event status");
    }

    data.status = body.status;
  } else if (!isPartial) {
    data.status = "DRAFT";
  }

  validateDateOrder(data, isPartial);

  if (isPartial && Object.keys(data).length === 0) {
    throw new ApiError(400, "At least one event field is required");
  }

  return data;
}

function validateDateOrder(data, isPartial) {
  if (!isPartial || (data.startTime && data.endTime)) {
    if (data.startTime >= data.endTime) {
      throw new ApiError(400, "startTime must be before endTime");
    }
  }

  if (!isPartial || (data.registrationDeadline && data.startTime)) {
    if (data.registrationDeadline >= data.startTime) {
      throw new ApiError(400, "registrationDeadline must be before startTime");
    }
  }
}

function validateCreateEvent(body) {
  return validateEventInput(body);
}

function validateUpdateEvent(body) {
  return validateEventInput(body, {
    partial: true,
  });
}

module.exports = {
  EVENT_STATUSES,
  validateCreateEvent,
  validateUpdateEvent,
};
