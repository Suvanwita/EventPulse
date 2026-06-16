const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const checkinService = require("./checkin.service");

const scanQrToken = asyncHandler(async (req, res) => {
  const result = await checkinService.scanQrToken(req.body, req.user);

  return response.success(res, 200, "Check-in completed", result);
});

const listEventCheckIns = asyncHandler(async (req, res) => {
  const checkIns = await checkinService.listEventCheckIns(
    req.params.id,
    req.user
  );

  return response.success(res, 200, "Check-ins fetched", {
    checkIns,
  });
});

module.exports = {
  scanQrToken,
  listEventCheckIns,
};
