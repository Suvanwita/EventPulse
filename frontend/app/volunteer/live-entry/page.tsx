import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { registrations } from "@/data/registrations";

export default function LiveEntryPage() {
  return (
    <ProtectedRoute roles={["VOLUNTEER", "ORGANIZER", "ADMIN"]}>
      <AppShell sidebar>
        <PageHeader title="Live entry" eyebrow="Volunteer" />
        <DataTable
          columns={["attendee", "pass", "event", "status"]}
          rows={registrations.map(({ attendee, pass, event, status }) => ({ attendee, pass, event, status }))}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
