const { randomUUID } = require("crypto");

const redis = require("../config/redis");
const ApiError = require("./ApiError");

async function acquireLock(key, ttlMs) {
  const token = randomUUID();
  const result = await redis.set(key, token, "NX", "PX", ttlMs);

  if (result !== "OK") {
    throw new ApiError(423, "Resource is locked", {
      key,
    });
  }

  return token;
}

async function releaseLock(key, token) {
  const releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end

    return 0
  `;

  return redis.eval(releaseScript, 1, key, token);
}

async function withRedisLock(key, ttlMs, callback) {
  const token = await acquireLock(key, ttlMs);

  try {
    return await callback();
  } finally {
    await releaseLock(key, token);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  withRedisLock,
};
