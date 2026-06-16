import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { events } from "@/lib/data";
import { EventsClient } from "./EventsClient";

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PageHeader title="Campus Event Radar" eyebrow="Live availability" />
        <EventsClient events={events} />
      </AppShell>
    </ProtectedRoute>
  );
}
