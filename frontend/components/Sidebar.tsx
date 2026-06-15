import Link from "next/link";

const items = [
  { href: "/organizer/dashboard", label: "Dashboard" },
  { href: "/organizer/events/new", label: "New event" },
  { href: "/volunteer/scan", label: "Scan passes" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function Sidebar() {
  return (
    <aside className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft lg:sticky lg:top-24">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Workspace</div>
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

