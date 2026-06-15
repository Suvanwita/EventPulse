import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { events } from "@/lib/data";

export default function PassesPage() {
  const passEvents = events.slice(0, 3);

  return (
    <AppShell>
      <PageHeader title="My passes" eyebrow="Student" />
      <div className="grid gap-5 md:grid-cols-3">
        {passEvents.map((event, index) => (
          <article key={event.id} className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-campus">Seat A-{index + 12}</p>
                <h2 className="mt-1 text-xl font-bold">{event.title}</h2>
              </div>
              <StatusBadge status={index === 0 ? "live" : "open"} />
            </div>
            <p className="mt-3 text-sm text-ink/60">{event.venue}</p>
            <Button href={`/pass/${event.id}`} variant="ghost" className="mt-5 w-full">
              View Pass
            </Button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}

