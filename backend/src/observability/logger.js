const crypto = require("crypto");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { trace } = require("@opentelemetry/api");

function getTraceFields() {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();

  if (!spanContext) {
    return {};
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: process.env.OTEL_SERVICE_NAME || "eventpulse-backend",
  },
  mixin: getTraceFields,
});

function createHttpLogger() {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const requestId = req.headers["x-request-id"] || crypto.randomUUID();
      res.setHeader("x-request-id", requestId);
      return requestId;
    },
    customProps(req) {
      return {
        requestId: req.id,
        ...getTraceFields(),
      };
    },
    customLogLevel(req, res, error) {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  });
}

module.exports = {
  createHttpLogger,
  logger,
};
