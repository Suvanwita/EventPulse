import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NotificationsClient } from "./NotificationsClient";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PageHeader title="Notification Center" eyebrow="Inbox" />
        <NotificationsClient />
      </AppShell>
    </ProtectedRoute>
  );
}
