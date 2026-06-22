const express = require("express");

const authController = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.post("/register", validateRequest(schemas.auth.register), authController.register);
router.post("/login", validateRequest(schemas.auth.login), authController.login);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
