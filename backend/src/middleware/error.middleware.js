const ApiError = require("../utils/ApiError");

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message =
    error instanceof ApiError || statusCode < 500
      ? error.message
      : "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null,
  });
}

module.exports = errorMiddleware;
