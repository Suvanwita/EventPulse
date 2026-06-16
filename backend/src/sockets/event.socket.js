function getEventRoom(eventId) {
  return `event:${eventId}`;
}

function registerEventSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join-event-room", (eventId, callback) => {
      if (!eventId) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message: "eventId is required",
          });
        }

        return;
      }

      socket.join(getEventRoom(eventId));

      if (typeof callback === "function") {
        callback({
          success: true,
          room: getEventRoom(eventId),
        });
      }
    });

    socket.on("leave-event-room", (eventId, callback) => {
      if (!eventId) {
        if (typeof callback === "function") {
          callback({
            success: false,
            message: "eventId is required",
          });
        }

        return;
      }

      socket.leave(getEventRoom(eventId));

      if (typeof callback === "function") {
        callback({
          success: true,
          room: getEventRoom(eventId),
        });
      }
    });
  });
}

module.exports = {
  getEventRoom,
  registerEventSocketHandlers,
};
