const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const registrationController = require("./registration.controller");

const router = express.Router({
  mergeParams: true,
});

router.post("/register", authMiddleware, registrationController.registerForEvent);
router.post("/cancel", authMiddleware, registrationController.cancelRegistration);
router.get(
  "/registration-status",
  authMiddleware,
  registrationController.getRegistrationStatus
);

module.exports = router;
