const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const searchController = require("./search.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/suggestions", searchController.getSuggestions);

module.exports = router;

