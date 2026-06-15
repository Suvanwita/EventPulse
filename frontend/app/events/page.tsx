import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { events } from "@/lib/data";
import { EventsClient } from "./EventsClient";

export default function EventsPage() {
  return (
    <AppShell>
      <PageHeader title="Campus Event Radar" eyebrow="Live availability" />
      <EventsClient events={events} />
    </AppShell>
  );
}
