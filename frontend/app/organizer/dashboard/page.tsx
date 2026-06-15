import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
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
        <Button href="/organizer/events/new">Create event</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">Recent events</h2>
        <DataTable
          columns={["title", "venue", "status", "registeredCount", "checkedInCount", "capacity"]}
          rows={events.map(({ title, venue, status, registeredCount, checkedInCount, capacity }) => ({ title, venue, status, registeredCount, checkedInCount, capacity }))}
        />
      </div>
    </AppShell>
  );
}
