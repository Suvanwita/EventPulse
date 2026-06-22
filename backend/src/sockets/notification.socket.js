const jwt = require("jsonwebtoken");

const env = require("../config/env");

function getUserRoom(userId) {
  return `user:${userId}`;
}

function getSocketUserId(socket) {
  const token = socket.handshake.auth?.token;

  if (!token || !env.JWT_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return payload.id || payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

function registerNotificationSocketHandlers(io) {
  io.on("connection", (socket) => {
    const userId = getSocketUserId(socket);

    if (!userId) {
      return;
    }

    socket.join(getUserRoom(userId));
  });
}

module.exports = {
  getUserRoom,
  registerNotificationSocketHandlers,
};
