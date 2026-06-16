const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const gateFlowService = require("./gateFlow.service");

const getGateRecommendation = asyncHandler(async (req, res) => {
  const recommendation = await gateFlowService.getGateRecommendation(req.params.id);

  return response.success(res, 200, "Gate recommendation fetched", recommendation);
});

const getGateFlow = asyncHandler(async (req, res) => {
  const flow = await gateFlowService.getGateFlow(req.params.id);

  return response.success(res, 200, "Gate flow fetched", flow);
});

module.exports = {
  getGateFlow,
  getGateRecommendation,
};

