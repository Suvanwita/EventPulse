const env = require("../config/env");

function getBullConnection(options = {}) {
  const url = new URL(env.REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number(url.pathname?.replace("/", "") || 0),
    enableOfflineQueue: options.worker === true,
    maxRetriesPerRequest: options.worker === true ? null : 1,
  };
}

module.exports = {
  getBullConnection,
};
