const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const eventController = require("./event.controller");
const schemas = require("../../validation/requestSchemas");
const checkinRoutes = require("../checkin/checkin.routes");
const eventCrewRoutes = require("../eventCrew/eventCrew.routes");
const gateFlowRoutes = require("../gateFlow/gateFlow.routes");
const passRoutes = require("../passes/pass.routes");
const registrationRoutes = require("../registrations/registration.routes");
const waitlistRoutes = require("../waitlist/waitlist.routes");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRole("ORGANIZER", "ADMIN"), validateRequest(schemas.events.create), eventController.createEvent);
router.get("/", validateRequest(schemas.events.list), eventController.listEvents);
router.use("/:id", passRoutes);
router.use("/:id", registrationRoutes);
router.use("/:id", waitlistRoutes);
router.use("/:id/checkins", checkinRoutes);
router.use("/:id/crew", eventCrewRoutes);
router.use("/:id/gates", gateFlowRoutes);
router.get("/:id", validateRequest(schemas.events.id), eventController.getEvent);
router.patch("/:id", validateRequest(schemas.events.update), eventController.updateEvent);
router.delete("/:id", validateRequest(schemas.events.id), eventController.deleteEvent);

module.exports = router;
