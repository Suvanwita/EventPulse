import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { events } from "@/lib/data";

export default function OrganizerEventsPage() {
  return (
    <ProtectedRoute roles={["ORGANIZER", "ADMIN"]}>
    <AppShell sidebar>
      <PageHeader title="My events" eyebrow="Organizer">
        <Button href="/organizer/events/new">Create Event</Button>
      </PageHeader>
      <DataTable
        columns={["title", "venue", "status", "registeredCount", "capacity"]}
        rows={events.map(({ title, venue, status, registeredCount, capacity }) => ({ title, venue, status, registeredCount, capacity }))}
      />
    </AppShell>
    </ProtectedRoute>
  );
}
