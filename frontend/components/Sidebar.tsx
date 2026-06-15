"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { roleNavigation, type Role } from "@/lib/roles";

export function Sidebar() {
  const [role, setRole] = useState<Role>("ORGANIZER");

  useEffect(() => {
    const storedRole = window.localStorage.getItem("eventpulse-role") as Role | null;
    if (storedRole && storedRole in roleNavigation) setRole(storedRole);
  }, []);

  const items = roleNavigation[role];

  return (
    <aside className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft lg:sticky lg:top-24">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/45">{role} workspace</div>
      <div className="grid gap-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-ink/70 hover:bg-mist hover:text-ink">
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
