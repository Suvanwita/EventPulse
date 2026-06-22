const express = require("express");

const authController = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const { rateLimiters } = require("../../utils/rateLimiter");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.post("/register", rateLimiters.authRegister, validateRequest(schemas.auth.register), authController.register);
router.post("/login", rateLimiters.authLogin, validateRequest(schemas.auth.login), authController.login);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
