const ApiError = require("../../utils/ApiError");

function parsePositiveInteger(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(400, `${fieldName} must be greater than 0`);
  }

  return number;
}

function validateVenueInput(body, options = {}) {
  const isPartial = options.partial === true;
  const data = {};

  if (!isPartial || Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      throw new ApiError(400, "Name is required");
    }

    data.name = name;
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(body, "location")) {
    const location =
      typeof body.location === "string" ? body.location.trim() : "";

    if (!location) {
      throw new ApiError(400, "Location is required");
    }

    data.location = location;
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(body, "zone")) {
    const zone = typeof body.zone === "string" ? body.zone.trim() : "";

    if (!zone) {
      throw new ApiError(400, "Zone is required");
    }

    data.zone = zone;
  }

  for (const fieldName of ["capacity", "rows", "seatsPerRow"]) {
    if (!isPartial || Object.prototype.hasOwnProperty.call(body, fieldName)) {
      data[fieldName] = parsePositiveInteger(body[fieldName], fieldName);
    }
  }

  const capacity = data.capacity ?? body.capacity;
  const rows = data.rows ?? body.rows;
  const seatsPerRow = data.seatsPerRow ?? body.seatsPerRow;

  if (
    capacity !== undefined &&
    rows !== undefined &&
    seatsPerRow !== undefined &&
    Number(rows) * Number(seatsPerRow) < Number(capacity)
  ) {
    throw new ApiError(400, "rows * seatsPerRow must be greater than or equal to capacity");
  }

  if (isPartial && Object.keys(data).length === 0) {
    throw new ApiError(400, "At least one venue field is required");
  }

  return data;
}

function validateCreateVenue(body) {
  return validateVenueInput(body);
}

function validateUpdateVenue(body) {
  return validateVenueInput(body, {
    partial: true,
  });
}

module.exports = {
  validateCreateVenue,
  validateUpdateVenue,
};
