const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const eventController = require("./event.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRole("ORGANIZER", "ADMIN"), eventController.createEvent);
router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.patch("/:id", eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
