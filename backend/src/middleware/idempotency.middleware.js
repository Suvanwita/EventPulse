const crypto = require("crypto");

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { logger } = require("../observability/logger");
const { recordIdempotency } = require("../observability/metrics");

const IDEMPOTENCY_STATUS = {
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

const DEFAULT_TTL_SECONDS = Number(process.env.IDEMPOTENCY_KEY_TTL_SECONDS) || 24 * 60 * 60;
const PROCESSING_REPLAY_STATUS = 409;

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function getIdempotencyKey(req) {
  const value = req.get("Idempotency-Key");

  return typeof value === "string" ? value.trim() : "";
}

function buildRequestFingerprint(req) {
  const fingerprintPayload = {
    method: req.method,
    route: req.baseUrl + (req.route?.path || req.path),
    params: req.params || {},
    query: req.query || {},
    body: req.body || {},
  };

  return crypto
    .createHash("sha256")
    .update(stableStringify(fingerprintPayload))
    .digest("hex");
}

function getExpiresAt() {
  return new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000);
}

function toJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function replayResponse(res, record) {
  res.set("Idempotency-Replayed", "true");
  res.set("Idempotency-Key", record.key);

  return res.status(record.responseStatus || 200).json(record.responseBody);
}

function captureSuccessfulResponse(req, res, recordId) {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && !res.headersSent) {
      try {
        await prisma.idempotencyKey.update({
          where: {
            id: recordId,
          },
          data: {
            status: IDEMPOTENCY_STATUS.COMPLETED,
            responseStatus: res.statusCode,
            responseBody: toJsonValue(body),
            error: null,
          },
        });
        recordIdempotency("completed");
      } catch (error) {
        logger.error({
          error,
          idempotencyRecordId: recordId,
          requestId: req.id,
        }, "Failed to persist idempotent response");
      }
    }

    return originalJson(body);
  };
}

function idempotencyMiddleware(options = {}) {
  const requireKey = options.requireKey !== false;

  return async (req, res, next) => {
    try {
      const key = getIdempotencyKey(req);

      if (!key) {
        if (requireKey) {
          throw new ApiError(400, "Idempotency-Key header is required");
        }

        return next();
      }

      if (!req.user?.id) {
        throw new ApiError(401, "Authentication required for idempotent requests");
      }

      const route = `${req.method} ${req.baseUrl}${req.route?.path || req.path}`;
      const requestFingerprint = buildRequestFingerprint(req);
      const now = new Date();
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_key: {
            userId: req.user.id,
            key,
          },
        },
      });

      if (existing) {
        if (existing.expiresAt < now) {
          await prisma.idempotencyKey.delete({
            where: {
              id: existing.id,
            },
          });
        } else {
          res.set("Idempotency-Key", key);

          if (existing.requestFingerprint !== requestFingerprint) {
            recordIdempotency("conflict");
            throw new ApiError(409, "Idempotency-Key was reused with a different request");
          }

          if (existing.status === IDEMPOTENCY_STATUS.COMPLETED && existing.responseBody) {
            recordIdempotency("replayed");
            return replayResponse(res, existing);
          }

          if (existing.status === IDEMPOTENCY_STATUS.FAILED) {
            recordIdempotency("retry_after_failure");
            await prisma.idempotencyKey.delete({
              where: {
                id: existing.id,
              },
            });
          } else {
            recordIdempotency("in_flight");
            throw new ApiError(PROCESSING_REPLAY_STATUS, "Idempotent request is still processing");
          }
        }
      }

      const record = await prisma.idempotencyKey.create({
        data: {
          key,
          userId: req.user.id,
          method: req.method,
          route,
          requestFingerprint,
          expiresAt: getExpiresAt(),
        },
      });

      req.idempotencyRecordId = record.id;
      res.set("Idempotency-Key", key);
      captureSuccessfulResponse(req, res, record.id);
      recordIdempotency("started");

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

async function markIdempotencyFailed(recordId, error) {
  if (!recordId) {
    return null;
  }

  recordIdempotency("failed");

  return prisma.idempotencyKey.update({
    where: {
      id: recordId,
    },
    data: {
      status: IDEMPOTENCY_STATUS.FAILED,
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode || 500,
      },
    },
  });
}

async function cleanupExpiredIdempotencyKeys(now = new Date()) {
  return prisma.idempotencyKey.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });
}

module.exports = {
  IDEMPOTENCY_STATUS,
  cleanupExpiredIdempotencyKeys,
  idempotencyMiddleware,
  markIdempotencyFailed,
};
