import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CapacityBar } from "@/components/CapacityBar";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { events, scans } from "@/lib/data";

export default async function OrganizerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();

  return (
    <AppShell sidebar>
      <PageHeader title={event.title} eyebrow="Event control">
        <StatusBadge status={event.status} />
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DataTable columns={["attendee", "pass", "event", "status"]} rows={scans} />
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Capacity monitor</h2>
          <div className="mt-5"><CapacityBar current={event.checkedInCount} capacity={event.capacity} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Waitlist</p><p className="text-2xl font-bold">{event.waitlistCount}</p></div>
            <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Remaining</p><p className="text-2xl font-bold">{event.capacity - event.registeredCount}</p></div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
