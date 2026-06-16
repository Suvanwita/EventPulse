const express = require("express");

const response = require("../utils/response");

const router = express.Router();

router.get("/health", (req, res) => {
  return response.success(res, 200, "EventPulse backend running");
});

module.exports = router;
