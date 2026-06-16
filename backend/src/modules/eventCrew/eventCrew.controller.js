const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const eventCrewService = require("./eventCrew.service");
const {
  validateCreateCrewAccess,
  validateUpdateCrewAccess,
} = require("./eventCrew.validation");

const createCrewAccess = asyncHandler(async (req, res) => {
  const input = validateCreateCrewAccess(req.body);
  const crewAccess = await eventCrewService.createCrewAccess(
    req.params.id,
    input,
    req.user
  );

  return response.created(res, "Crew access granted", {
    crewAccess,
  });
});

const listCrewAccess = asyncHandler(async (req, res) => {
  const crew = await eventCrewService.listCrewAccess(req.params.id, req.user);

  return response.success(res, 200, "Crew access fetched", {
    crew,
  });
});

const getMyCrewAccess = asyncHandler(async (req, res) => {
  const crewAccess = await eventCrewService.getMyCrewAccess(
    req.params.id,
    req.user
  );

  return response.success(res, 200, "My crew access fetched", {
    crewAccess,
  });
});

const updateCrewAccess = asyncHandler(async (req, res) => {
  const input = validateUpdateCrewAccess(req.body);
  const crewAccess = await eventCrewService.updateCrewAccess(
    req.params.id,
    req.params.crewAccessId,
    input,
    req.user
  );

  return response.success(res, 200, "Crew access updated", {
    crewAccess,
  });
});

const revokeCrewAccess = asyncHandler(async (req, res) => {
  const crewAccess = await eventCrewService.revokeCrewAccess(
    req.params.id,
    req.params.crewAccessId,
    req.user
  );

  return response.success(res, 200, "Crew access revoked", {
    crewAccess,
  });
});

module.exports = {
  createCrewAccess,
  getMyCrewAccess,
  listCrewAccess,
  revokeCrewAccess,
  updateCrewAccess,
};

