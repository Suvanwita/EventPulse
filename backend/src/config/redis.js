const Redis = require("ioredis");

const env = require("./env");

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redis.on("error", () => {
  // Redis-backed utilities surface command failures to callers.
});

module.exports = redis;
