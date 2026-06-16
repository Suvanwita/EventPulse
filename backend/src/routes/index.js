const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const response = require("../utils/response");

const router = express.Router();

router.use("/api/auth", authRoutes);

router.get("/health", (req, res) => {
  return response.success(res, 200, "EventPulse backend running");
});

module.exports = router;
