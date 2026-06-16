const redis = require("../config/redis");
const ApiError = require("./ApiError");

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

module.exports = {
  checkRateLimit,
};
