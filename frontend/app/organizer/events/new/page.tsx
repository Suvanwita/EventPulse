import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { venues } from "@/lib/data";
import { NewEventClient } from "./NewEventClient";

export default function NewEventPage() {
  return (
    <ProtectedRoute roles={["ORGANIZER", "ADMIN"]}>
      <AppShell sidebar>
        <PageHeader title="Event Launch Configuration" eyebrow="Organizer" />
        <NewEventClient fallbackVenues={venues} />
      </AppShell>
    </ProtectedRoute>
  );
}
