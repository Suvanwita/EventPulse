const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const passService = require("./pass.service");

const getEventPass = asyncHandler(async (req, res) => {
  const pass = await passService.getEventPass(req.params.id, req.user, {
    userId: req.query.userId,
  });

  return response.success(res, 200, "Event pass fetched", pass);
});

module.exports = {
  getEventPass,
};
