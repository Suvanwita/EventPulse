import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CapacityBar } from "@/components/CapacityBar";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { events } from "@/lib/data";
import { registrations } from "@/data/registrations";

export default async function OrganizerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();
  const eventRegistrations = registrations.filter((registration) => registration.eventId === event.id || registration.event === event.title);
  const registeredRows = eventRegistrations.filter((registration) => registration.status !== "Waitlisted");
  const waitlistRows = eventRegistrations.filter((registration) => registration.status === "Waitlisted");
  const checkInRows = eventRegistrations.filter((registration) => registration.status === "Checked in");
  const remainingSeats = Math.max(event.capacity - event.registeredCount, 0);
  const entryRate = event.registeredCount > 0 ? Math.round((event.checkedInCount / event.registeredCount) * 100) : 0;

  return (
    <AppShell sidebar>
      <PageHeader title={event.title} eyebrow="Event control">
        <StatusBadge status={event.status} />
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Registered" value={String(event.registeredCount)} delta="Total registrations" />
        <StatCard label="Checked in" value={String(event.checkedInCount)} delta="Scanned at entry" />
        <StatCard label="Waitlist" value={String(event.waitlistCount)} delta="Queued students" />
        <StatCard label="Remaining seats" value={String(remainingSeats)} delta="Capacity available" />
        <StatCard label="Entry rate" value={`${entryRate}%`} delta="Placeholder metric" />
        <StatCard label="Capacity" value={String(event.capacity)} delta="Venue limit" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="grid gap-6">
          <div>
            <h2 className="mb-4 text-xl font-bold">Registrations</h2>
            <DataTable columns={["attendee", "pass", "seat", "status"]} rows={registeredRows.map(({ attendee, pass, seat, status }) => ({ attendee, pass, seat, status }))} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold">Waitlist</h2>
            <DataTable columns={["attendee", "pass", "status"]} rows={waitlistRows.map(({ attendee, pass, status }) => ({ attendee, pass, status }))} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold">Check-ins</h2>
            <DataTable columns={["attendee", "pass", "checkedInAt", "status"]} rows={checkInRows.map(({ attendee, pass, checkedInAt, status }) => ({ attendee, pass, checkedInAt, status }))} />
          </div>
        </section>
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Live capacity stats</h2>
          <div className="mt-5"><CapacityBar current={event.registeredCount} capacity={event.capacity} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Registered</p><p className="text-2xl font-bold">{event.registeredCount}</p></div>
            <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Checked in</p><p className="text-2xl font-bold">{event.checkedInCount}</p></div>
            <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Waitlist</p><p className="text-2xl font-bold">{event.waitlistCount}</p></div>
            <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Remaining</p><p className="text-2xl font-bold">{remainingSeats}</p></div>
          </div>
          <div className="mt-5 rounded-md border border-dashed border-campus/30 bg-mist p-4">
            <p className="text-sm text-ink/55">Entry rate placeholder</p>
            <p className="mt-1 text-2xl font-bold">{entryRate}%</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
