import { AppShell } from "@/components/AppShell";
import { NeonButton } from "@/components/NeonButton";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ActivityTimeline, EventRadarCard, GlassPanel, MetricOrb, QueueFlowLane } from "@/components/OpsUI";
import { events } from "@/lib/data";

const totalEvents = events.length;
const liveEvents = events.filter((event) => event.status === "live").length;
const totalRegistrations = events.reduce((total, event) => total + event.registeredCount, 0);
const totalCheckIns = events.reduce((total, event) => total + event.checkedInCount, 0);
const averageAttendance = Math.round((totalCheckIns / totalRegistrations) * 100);

const dashboardStats = [
  { label: "Total events", value: String(totalEvents), delta: "All organizer events" },
  { label: "Live events", value: String(liveEvents), delta: "Happening now" },
  { label: "Total registrations", value: totalRegistrations.toLocaleString(), delta: "Across all events" },
  { label: "Total check-ins", value: totalCheckIns.toLocaleString(), delta: "Scanned passes" },
  { label: "Average attendance", value: `${averageAttendance}%`, delta: "Check-ins vs registrations" },
];

export default function OrganizerDashboardPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Organizer dashboard" eyebrow="Today">
        <NeonButton href="/organizer/events/new">Create Event</NeonButton>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {dashboardStats.map((stat, index) => <MetricOrb key={stat.label} label={stat.label} value={stat.value} tone={index === 1 ? "lime" : index === 2 ? "violet" : index === 3 ? "amber" : "cyan"} />)}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5 lg:grid-cols-2">
          {events.slice(0, 4).map((event) => <EventRadarCard key={event.id} event={event} />)}
        </div>
        <div className="grid gap-6">
          <GlassPanel>
            <h2 className="text-xl font-black text-white">Crowd Pressure Summary</h2>
            <div className="mt-5 grid gap-4">
              <QueueFlowLane label="Waitlist pressure" count={events.reduce((total, event) => total + event.waitlistCount, 0)} tone="violet" />
              <QueueFlowLane label="Attendance pulse" count={averageAttendance} tone="lime" />
            </div>
          </GlassPanel>
          <ActivityTimeline items={events.slice(0, 4).map((event) => ({ title: event.title, meta: `${event.venue} / ${event.status}`, tone: event.status === "live" ? "lime" : event.status === "waitlist" ? "violet" : "cyan" }))} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-black text-white">Recent Events Table</h2>
        <DataTable
          columns={["title", "venue", "status", "registeredCount", "checkedInCount", "capacity"]}
          rows={events.map(({ title, venue, status, registeredCount, checkedInCount, capacity }) => ({ title, venue, status, registeredCount, checkedInCount, capacity }))}
        />
      </div>
    </AppShell>
  );
}
