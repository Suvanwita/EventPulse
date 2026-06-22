const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validateRequest.middleware");
const searchController = require("./search.controller");
const schemas = require("../../validation/requestSchemas");

const router = express.Router();

router.use(authMiddleware);

router.get("/suggestions", validateRequest(schemas.search.suggestions), searchController.getSuggestions);

module.exports = router;
