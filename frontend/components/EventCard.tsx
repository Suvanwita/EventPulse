import { Button } from "./Button";
import { CapacityBar } from "./CapacityBar";
import { StatusBadge } from "./StatusBadge";
import type { EventRecord } from "@/lib/data";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function EventCard({ event }: { event: EventRecord }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-32" style={{ background: event.image }} />
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-campus">{event.category}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight group-hover:text-campus">{event.title}</h2>
          </div>
          <StatusBadge status={event.status} />
        </div>
        <p className="text-sm text-ink/60">{formatDateTime(event.startTime)} · {event.venue}</p>
        <CapacityBar current={event.registeredCount} capacity={event.capacity} />
        <Button href={`/events/${event.id}`} variant="ghost" className="w-full">
          View Details
        </Button>
      </div>
    </article>
  );
}
