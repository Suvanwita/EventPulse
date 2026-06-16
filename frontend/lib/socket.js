import { io } from "socket.io-client";
import { getToken } from "./auth";

let socket = null;

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
}

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (socket?.connected || socket?.active) {
    return socket;
  }

  socket = io(getSocketUrl(), {
    autoConnect: true,
    transports: ["websocket", "polling"],
    auth: {
      token: getToken(),
    },
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

