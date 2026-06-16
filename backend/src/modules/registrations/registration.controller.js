const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const registrationService = require("./registration.service");

const registerForEvent = asyncHandler(async (req, res) => {
  const result = await registrationService.registerForEvent(
    req.params.id,
    req.user
  );

  return response.created(res, "Registration request processed", result);
});

const cancelRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.cancelRegistration(
    req.params.id,
    req.user
  );

  return response.success(res, 200, "Registration cancelled", result);
});

const getRegistrationStatus = asyncHandler(async (req, res) => {
  const status = await registrationService.getRegistrationStatus(
    req.params.id,
    req.user
  );

  return response.success(res, 200, "Registration status fetched", status);
});

module.exports = {
  cancelRegistration,
  getRegistrationStatus,
  registerForEvent,
};
