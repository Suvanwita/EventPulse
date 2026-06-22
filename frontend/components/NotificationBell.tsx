"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    let active = true;

    get("/api/notifications/unread-count")
      .then((payload) => {
        if (active) setUnreadCount(Number(payload?.data?.unreadCount || 0));
      })
      .catch(() => undefined);

    const socket = getSocket();
    if (!socket) {
      return () => {
        active = false;
      };
    }
    const handleCreated = (payload: any) => {
      setUnreadCount(Number(payload?.unreadCount ?? 0));
    };
    const handleRead = (payload: any) => {
      setUnreadCount(Number(payload?.unreadCount ?? 0));
    };

    socket.on("notification-created", handleCreated);
    socket.on("notification-read", handleRead);

    return () => {
      active = false;
      socket.off("notification-created", handleCreated);
      socket.off("notification-read", handleRead);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/14 bg-white/6 text-sm font-black text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
    >
      <span aria-hidden="true">N</span>
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-void bg-amber px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-void">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
