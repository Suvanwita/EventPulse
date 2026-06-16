const { Server } = require("socket.io");

const env = require("../config/env");
const { registerEventSocketHandlers } = require("./event.socket");

let ioInstance = null;

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  ioInstance = io;
  registerEventSocketHandlers(io);

  return io;
}

function getSocketServer() {
  return ioInstance;
}

module.exports = {
  getSocketServer,
  initSocketServer,
};
