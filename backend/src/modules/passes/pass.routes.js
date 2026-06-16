const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const passController = require("./pass.controller");

const router = express.Router({
  mergeParams: true,
});

router.get("/pass", authMiddleware, passController.getEventPass);

module.exports = router;
