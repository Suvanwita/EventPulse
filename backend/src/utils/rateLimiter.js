const redis = require("../config/redis");
const ApiError = require("./ApiError");

function normalizeKeyPart(value) {
  return String(value || "anonymous")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._:-]/g, "_")
    .slice(0, 160);
}

async function checkRateLimit(key, limit, windowSeconds) {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  const resetInSeconds = ttl > 0 ? ttl : windowSeconds;
  const resetAt = new Date(Date.now() + resetInSeconds * 1000);
  const remaining = Math.max(limit - current, 0);

  if (current > limit) {
    throw new ApiError(429, "Rate limit exceeded", {
      limit,
      remaining: 0,
      resetAt,
    });
  }

  return {
    limit,
    remaining,
    resetAt,
  };
}

async function applyRateLimits(limiters) {
  let strictestResult = null;

  for (const limiter of limiters) {
    const result = await checkRateLimit(limiter.key, limiter.limit, limiter.windowSeconds);

    if (!strictestResult || result.remaining < strictestResult.remaining) {
      strictestResult = result;
    }
  }

  return strictestResult;
}

function setRateLimitHeaders(res, result) {
  if (!result) {
    return;
  }

  res.set("RateLimit-Limit", String(result.limit));
  res.set("RateLimit-Remaining", String(result.remaining));
  res.set("RateLimit-Reset", String(Math.ceil(result.resetAt.getTime() / 1000)));
}

function createRateLimitMiddleware(options) {
  const {
    name,
    limit,
    windowSeconds,
    keyParts = [],
    additionalLimits = [],
  } = options;

  return async (req, res, next) => {
    try {
      const baseParts = [
        "rate",
        normalizeKeyPart(name),
        ...keyParts.map((part) => normalizeKeyPart(typeof part === "function" ? part(req) : part)),
      ];
      const limiters = [
        {
          key: baseParts.join(":"),
          limit,
          windowSeconds,
        },
        ...additionalLimits.map((limiter) => ({
          key: [
            "rate",
            normalizeKeyPart(limiter.name || name),
            ...limiter.keyParts.map((part) => normalizeKeyPart(typeof part === "function" ? part(req) : part)),
          ].join(":"),
          limit: limiter.limit,
          windowSeconds: limiter.windowSeconds,
        })),
      ];

      const result = await applyRateLimits(limiters);
      setRateLimitHeaders(res, result);
      next();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429) {
        setRateLimitHeaders(res, error.details);
      }

      next(error);
    }
  };
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown-ip";
}

function getUserId(req) {
  return req.user?.id || "anonymous-user";
}

function getEmail(req) {
  return req.body?.email || "unknown-email";
}

const rateLimiters = {
  authLogin: createRateLimitMiddleware({
    name: "auth_login_ip",
    limit: Number(process.env.RATE_LIMIT_AUTH_LOGIN_IP_LIMIT) || 20,
    windowSeconds: Number(process.env.RATE_LIMIT_AUTH_LOGIN_IP_WINDOW_SECONDS) || 15 * 60,
    keyParts: [getClientIp],
    additionalLimits: [
      {
        name: "auth_login_email",
        limit: Number(process.env.RATE_LIMIT_AUTH_LOGIN_EMAIL_LIMIT) || 8,
        windowSeconds: Number(process.env.RATE_LIMIT_AUTH_LOGIN_EMAIL_WINDOW_SECONDS) || 15 * 60,
        keyParts: [getEmail],
      },
      {
        name: "auth_login_email_ip",
        limit: Number(process.env.RATE_LIMIT_AUTH_LOGIN_EMAIL_IP_LIMIT) || 5,
        windowSeconds: Number(process.env.RATE_LIMIT_AUTH_LOGIN_EMAIL_IP_WINDOW_SECONDS) || 15 * 60,
        keyParts: [getEmail, getClientIp],
      },
    ],
  }),
  authRegister: createRateLimitMiddleware({
    name: "auth_register_ip",
    limit: Number(process.env.RATE_LIMIT_AUTH_REGISTER_IP_LIMIT) || 10,
    windowSeconds: Number(process.env.RATE_LIMIT_AUTH_REGISTER_IP_WINDOW_SECONDS) || 60 * 60,
    keyParts: [getClientIp],
    additionalLimits: [
      {
        name: "auth_register_email",
        limit: Number(process.env.RATE_LIMIT_AUTH_REGISTER_EMAIL_LIMIT) || 3,
        windowSeconds: Number(process.env.RATE_LIMIT_AUTH_REGISTER_EMAIL_WINDOW_SECONDS) || 60 * 60,
        keyParts: [getEmail],
      },
    ],
  }),
  qrScan: createRateLimitMiddleware({
    name: "qr_scan_user",
    limit: Number(process.env.RATE_LIMIT_QR_SCAN_USER_LIMIT) || 60,
    windowSeconds: Number(process.env.RATE_LIMIT_QR_SCAN_USER_WINDOW_SECONDS) || 60,
    keyParts: [getUserId],
  }),
  passGeneration: createRateLimitMiddleware({
    name: "pass_generation_user",
    limit: Number(process.env.RATE_LIMIT_PASS_GENERATION_USER_LIMIT) || 30,
    windowSeconds: Number(process.env.RATE_LIMIT_PASS_GENERATION_USER_WINDOW_SECONDS) || 60,
    keyParts: [getUserId],
  }),
  notificationMutation: createRateLimitMiddleware({
    name: "notification_mutation_user",
    limit: Number(process.env.RATE_LIMIT_NOTIFICATION_MUTATION_USER_LIMIT) || 60,
    windowSeconds: Number(process.env.RATE_LIMIT_NOTIFICATION_MUTATION_USER_WINDOW_SECONDS) || 60,
    keyParts: [getUserId],
  }),
  adminWrite: createRateLimitMiddleware({
    name: "admin_write_user",
    limit: Number(process.env.RATE_LIMIT_ADMIN_WRITE_USER_LIMIT) || 60,
    windowSeconds: Number(process.env.RATE_LIMIT_ADMIN_WRITE_USER_WINDOW_SECONDS) || 60,
    keyParts: [getUserId],
  }),
};

module.exports = {
  checkRateLimit,
  createRateLimitMiddleware,
  rateLimiters,
};
