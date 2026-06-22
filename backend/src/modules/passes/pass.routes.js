const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const passController = require("./pass.controller");
const { rateLimiters } = require("../../utils/rateLimiter");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.get("/pass", authMiddleware, rateLimiters.passGeneration, validateRequest(schemas.passes.get), passController.getEventPass);

module.exports = router;
