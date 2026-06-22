const ApiError = require("../utils/ApiError");
const { authorize } = require("../authorization/ability");

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }

    next();
  };
}

function requireAbility(action, subject) {
  return (req, res, next) => {
    try {
      authorize(req.user, action, subject);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireAbility,
  requireRole,
};
