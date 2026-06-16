const http = require("http");

const app = require("./app");
const env = require("./config/env");
const { initSocketServer } = require("./sockets");

const server = http.createServer(app);

initSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`EventPulse backend listening on port ${env.PORT}`);
});
