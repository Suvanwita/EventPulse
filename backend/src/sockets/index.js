const { Server } = require("socket.io");

const env = require("../config/env");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  return io;
}

module.exports = {
  initSocketServer,
};
