"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { roleNavigation, type Role } from "@/lib/roles";

export function Sidebar() {
  const [role, setRole] = useState<Role>("ORGANIZER");
  const [name, setName] = useState("");

  useEffect(() => {
    const user = getUser();
    if (user?.role && user.role in roleNavigation) {
      setRole(user.role);
      setName(user.name);
    }
  }, []);

  const items = roleNavigation[role];

  return (
    <aside className="rounded-2xl border border-cyan-200/12 bg-panel p-3 shadow-soft backdrop-blur-xl lg:sticky lg:top-24">
      <div className="px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100/45">{role} workspace</div>
      {name ? <div className="px-3 pb-3 text-sm font-bold text-white/70">{name}</div> : null}
      <div className="grid gap-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-xl px-3 py-3 text-sm font-bold text-white/62 transition hover:bg-cyan-300/10 hover:text-cyan-100">
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export const ControlSidebar = Sidebar;
