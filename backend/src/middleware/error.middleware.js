const ApiError = require("../utils/ApiError");
const { logger } = require("../observability/logger");

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message =
    error instanceof ApiError || statusCode < 500
      ? error.message
      : "Internal server error";

  logger[statusCode >= 500 ? "error" : "warn"](
    {
      error,
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
    },
    "Request failed"
  );

  return res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null,
  });
}

module.exports = errorMiddleware;
