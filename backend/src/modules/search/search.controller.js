const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const searchService = require("./search.service");

const getSuggestions = asyncHandler(async (req, res) => {
  const result = await searchService.getSuggestions(req.query.q, req.query.limit);

  return response.success(res, 200, "Suggestions fetched", result);
});

module.exports = {
  getSuggestions,
};

