const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const waitlistController = require("./waitlist.controller");

const router = express.Router({
  mergeParams: true,
});

router.get("/waitlist", authMiddleware, waitlistController.getWaitlist);
router.post("/promote-next", authMiddleware, waitlistController.promoteNext);

module.exports = router;
