import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { PageHeader } from "@/components/PageHeader";
import { events } from "@/lib/data";

export default function EventsPage() {
  return (
    <AppShell>
      <PageHeader title="Campus events" eyebrow="Live availability" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </AppShell>
  );
}

