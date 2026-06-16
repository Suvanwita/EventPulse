const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const waitlistService = require("./waitlist.service");

const getWaitlist = asyncHandler(async (req, res) => {
  const waitlist = await waitlistService.getWaitlist(req.params.id, req.user);

  return response.success(res, 200, "Waitlist fetched", {
    waitlist,
  });
});

const promoteNext = asyncHandler(async (req, res) => {
  const result = await waitlistService.promoteNext(req.params.id, req.user);

  return response.success(res, 200, "Waitlist entry promoted", result);
});

module.exports = {
  getWaitlist,
  promoteNext,
};
