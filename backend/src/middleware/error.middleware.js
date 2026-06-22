const ApiError = require("../utils/ApiError");
const { logger } = require("../observability/logger");
const { markIdempotencyFailed } = require("./idempotency.middleware");

async function errorMiddleware(error, req, res, next) {
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

  await markIdempotencyFailed(req.idempotencyRecordId, error).catch((idempotencyError) => {
    logger.error({
      error: idempotencyError,
      requestId: req.id,
      idempotencyRecordId: req.idempotencyRecordId,
    }, "Failed to mark idempotent request as failed");
  });

  return res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null,
  });
}

module.exports = errorMiddleware;
