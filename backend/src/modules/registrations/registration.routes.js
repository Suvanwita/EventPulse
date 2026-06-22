const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const registrationController = require("./registration.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.post("/register", authMiddleware, validateRequest(schemas.events.id), registrationController.registerForEvent);
router.post("/cancel", authMiddleware, validateRequest(schemas.events.id), registrationController.cancelRegistration);
router.get(
  "/registration-status",
  authMiddleware,
  validateRequest(schemas.events.id),
  registrationController.getRegistrationStatus
);

module.exports = router;
