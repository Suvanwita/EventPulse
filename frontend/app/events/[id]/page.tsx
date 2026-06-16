import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { events, venues } from "@/lib/data";
import { EventDetailClient } from "./EventDetailClient";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();
  const venue = venues.find((item) => item.name === event.venue);

  return (
    <ProtectedRoute>
      <AppShell>
        <PageHeader title="Event Signal Panel" eyebrow={event.title} />
        <EventDetailClient event={event} venue={venue} />
      </AppShell>
    </ProtectedRoute>
  );
}
