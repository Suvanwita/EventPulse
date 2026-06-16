import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { crowdPattern, events, venues } from "@/lib/data";
import { AdminAnalyticsClient } from "./AdminAnalyticsClient";

export default function AdminAnalyticsPage() {
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <AppShell sidebar>
        <PageHeader title="Analytics Core" eyebrow="Admin" />
        <AdminAnalyticsClient fallbackEvents={events} fallbackVenues={venues} fallbackPattern={crowdPattern} />
      </AppShell>
    </ProtectedRoute>
  );
}
