import Link from "next/link";
import { CapacityBar } from "./CapacityBar";
import { StatusBadge } from "./StatusBadge";
import type { events } from "@/lib/data";

type Event = (typeof events)[number];

export function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="group overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-32" style={{ background: event.image }} />
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-campus">{event.category}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight group-hover:text-campus">{event.title}</h2>
          </div>
          <StatusBadge status={event.status} />
        </div>
        <p className="text-sm text-ink/60">{event.date} · {event.time} · {event.venue}</p>
        <CapacityBar current={event.checkedIn} capacity={event.capacity} />
      </div>
    </Link>
  );
}

