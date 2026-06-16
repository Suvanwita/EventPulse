import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { events } from "@/lib/data";
import { OrganizerDashboardClient } from "./OrganizerDashboardClient";

export default function OrganizerDashboardPage() {
  return (
    <ProtectedRoute roles={["ORGANIZER", "ADMIN"]}>
      <AppShell sidebar>
        <PageHeader title="Organizer dashboard" eyebrow="Today" />
        <OrganizerDashboardClient fallbackEvents={events} />
      </AppShell>
    </ProtectedRoute>
  );
}
