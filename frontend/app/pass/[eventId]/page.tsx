import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PassClient } from "./PassClient";

export default async function PassPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  return (
    <ProtectedRoute>
      <AppShell>
        <PageHeader title="Digital Access Badge" eyebrow="Encrypted QR pass" />
        <PassClient eventId={eventId} />
      </AppShell>
    </ProtectedRoute>
  );
}
