import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { venues } from "@/lib/data";
import { AdminVenuesClient } from "./AdminVenuesClient";

export default function AdminVenuesPage() {
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <AppShell sidebar>
        <PageHeader title="Venue Grid" eyebrow="Admin" />
        <AdminVenuesClient fallbackVenues={venues} />
      </AppShell>
    </ProtectedRoute>
  );
}
