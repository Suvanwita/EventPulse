import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StatusBadge } from "@/components/StatusBadge";
import { events } from "@/lib/data";
import { registrations } from "@/data/registrations";
import { OrganizerEventClient } from "./OrganizerEventClient";

export default async function OrganizerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();
  const eventRegistrations = registrations.filter((registration) => registration.eventId === event.id || registration.event === event.title);

  return (
    <ProtectedRoute roles={["ORGANIZER", "ADMIN"]}>
      <AppShell sidebar>
        <PageHeader title="Event Control Room" eyebrow={event.title}>
          <StatusBadge status={event.status} />
        </PageHeader>
        <OrganizerEventClient fallbackEvent={event} fallbackRegistrations={eventRegistrations} />
      </AppShell>
    </ProtectedRoute>
  );
}
