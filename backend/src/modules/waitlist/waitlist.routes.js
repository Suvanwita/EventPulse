const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const waitlistController = require("./waitlist.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router({
  mergeParams: true,
});

router.get("/waitlist", authMiddleware, validateRequest(schemas.events.id), waitlistController.getWaitlist);
router.post("/promote-next", authMiddleware, validateRequest(schemas.events.id), waitlistController.promoteNext);

module.exports = router;
