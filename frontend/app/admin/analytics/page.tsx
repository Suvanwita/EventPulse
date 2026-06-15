import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { crowdPattern, events, stats, venues } from "@/lib/data";

const analyticsStats = [
  ...stats,
  {
    label: "Avg utilization",
    value: `${Math.round(venues.reduce((total, venue) => total + venue.occupancy, 0) / venues.length)}%`,
    delta: "Across managed venues",
  },
];

export default function AdminAnalyticsPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Campus analytics" eyebrow="Admin" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {analyticsStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <section className="mt-8 grid gap-6">
        <div>
          <h2 className="mb-4 text-xl font-bold">Venue utilization</h2>
          <DataTable
            columns={["name", "capacity", "occupancy", "location"]}
            rows={venues.map(({ name, capacity, occupancy, location }) => ({ name, capacity, occupancy: `${occupancy}%`, location }))}
          />
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold">Event attendance</h2>
          <DataTable
            columns={["title", "venue", "registeredCount", "checkedInCount", "attendanceRate"]}
            rows={events.map(({ title, venue, registeredCount, checkedInCount }) => ({
              title,
              venue,
              registeredCount,
              checkedInCount,
              attendanceRate: `${registeredCount > 0 ? Math.round((checkedInCount / registeredCount) * 100) : 0}%`,
            }))}
          />
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Crowd pattern</h2>
          <div className="mt-6 flex h-56 items-end gap-3">
            {crowdPattern.map((height, index) => (
              <div key={index} className="flex flex-1 items-end rounded-t-md bg-mist">
                <div className="w-full rounded-t-md bg-campus" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
