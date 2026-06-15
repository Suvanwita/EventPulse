import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ActivityTimeline, CapacityRadar, GlassPanel, MetricOrb, QueueFlowLane } from "@/components/OpsUI";
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
      <PageHeader title="Event Control Room" eyebrow={event.title}>
        <StatusBadge status={event.status} />
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricOrb label="Registered" value={String(event.registeredCount)} />
        <MetricOrb label="Checked in" value={String(event.checkedInCount)} tone="lime" />
        <MetricOrb label="Waitlist" value={String(event.waitlistCount)} tone="violet" />
        <MetricOrb label="Remaining" value={String(remainingSeats)} tone="amber" />
        <MetricOrb label="Entry rate" value={`${entryRate}%`} tone="cyan" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="grid gap-6">
          <GlassPanel>
            <h2 className="mb-4 text-xl font-black text-white">Registrations</h2>
            <DataTable columns={["attendee", "pass", "seat", "status"]} rows={registeredRows.map(({ attendee, pass, seat, status }) => ({ attendee, pass, seat, status }))} />
          </GlassPanel>
          <GlassPanel>
            <h2 className="mb-4 text-xl font-black text-white">Waitlist Queue Lane</h2>
            <QueueFlowLane label="Active queue" count={event.waitlistCount} />
            <div className="mt-5">
            <DataTable columns={["attendee", "pass", "status"]} rows={waitlistRows.map(({ attendee, pass, status }) => ({ attendee, pass, status }))} />
            </div>
          </GlassPanel>
          <ActivityTimeline items={checkInRows.map(({ attendee, checkedInAt, status }) => ({ title: attendee, meta: `${status} / ${checkedInAt}`, tone: "lime" }))} />
        </section>
        <aside className="grid h-fit gap-6">
          <CapacityRadar current={event.registeredCount} capacity={event.capacity} />
          <GlassPanel>
          <h2 className="text-xl font-black text-white">Gate Status Cards</h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {["Main", "North", "Overflow", "Staff"].map((gate, index) => (
              <div key={gate} className="rounded-xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm text-white/55">{gate}</p>
                <p className="mt-1 text-xl font-black text-white">{index === 2 ? "Queue" : "Open"}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-cyan-300/25 bg-cyan-300/8 p-4">
            <p className="text-sm text-white/55">Entry rate placeholder</p>
            <p className="mt-1 text-2xl font-black text-white">{entryRate}%</p>
          </div>
          </GlassPanel>
        </aside>
      </div>
    </AppShell>
  );
}
