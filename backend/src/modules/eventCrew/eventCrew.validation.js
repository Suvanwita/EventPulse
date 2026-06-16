const ApiError = require("../../utils/ApiError");

const ACCESS_TYPES = [
  "EVENT_ORGANIZER",
  "CREW",
  "PERFORMER",
  "SPEAKER",
  "VOLUNTEER_HELPER",
  "VIP_ENTRY",
];

function validateAccessType(accessType) {
  if (!ACCESS_TYPES.includes(accessType)) {
    throw new ApiError(400, "Invalid accessType");
  }
}

function validateCreateCrewAccess(body) {
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const gateName = typeof body.gateName === "string" ? body.gateName.trim() : "";
  const accessType = typeof body.accessType === "string" ? body.accessType.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : null;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  if (!gateName) {
    throw new ApiError(400, "gateName is required");
  }

  validateAccessType(accessType);

  return {
    userId,
    gateName,
    accessType,
    note,
  };
}

function validateUpdateCrewAccess(body) {
  const data = {};

  if (body.gateName !== undefined) {
    const gateName = typeof body.gateName === "string" ? body.gateName.trim() : "";
    if (!gateName) {
      throw new ApiError(400, "gateName cannot be empty");
    }
    data.gateName = gateName;
  }

  if (body.accessType !== undefined) {
    validateAccessType(body.accessType);
    data.accessType = body.accessType;
  }

  if (body.note !== undefined) {
    data.note = typeof body.note === "string" ? body.note.trim() : null;
  }

  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  return data;
}

module.exports = {
  ACCESS_TYPES,
  validateCreateCrewAccess,
  validateUpdateCrewAccess,
};

