import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { AnalyticsMatrix, CompactMetric, GlassPanel, QueueFlowLane } from "@/components/OpsUI";
import { PageHeader } from "@/components/PageHeader";
import { crowdPattern, events, stats, venues } from "@/lib/data";

const analyticsStats = [
  ...stats,
  {
    label: "Avg utilization",
    value: `${Math.round(venues.reduce((total, venue) => total + venue.occupancy, 0) / venues.length)}%`,
    delta: "Venue mean",
  },
];

export default function AdminAnalyticsPage() {
  const attendanceRows = events.map(({ title, venue, registeredCount, checkedInCount }) => ({
    title,
    venue,
    registered: registeredCount,
    checkedIn: checkedInCount,
    rate: `${registeredCount > 0 ? Math.round((checkedInCount / registeredCount) * 100) : 0}%`,
  }));

  return (
    <AppShell sidebar>
      <PageHeader title="Analytics Core" eyebrow="Admin" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {analyticsStats.map((stat, index) => (
          <CompactMetric
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            tone={index === 1 ? "violet" : index === 2 ? "lime" : index === 3 ? "amber" : "cyan"}
          />
        ))}
      </div>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid min-w-0 gap-5">
          <GlassPanel className="min-w-0 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Venue Utilization</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/55">Infrastructure load</span>
            </div>
            <DataTable
              columns={["name", "capacity", "occupancy", "location"]}
              rows={venues.map(({ name, capacity, occupancy, location }) => ({ name, capacity, occupancy: `${occupancy}%`, location }))}
            />
          </GlassPanel>

          <GlassPanel className="min-w-0 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Event Attendance</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/55">Registration to entry</span>
            </div>
            <DataTable columns={["title", "venue", "registered", "checkedIn", "rate"]} rows={attendanceRows} />
          </GlassPanel>
        </div>

        <aside className="grid h-fit gap-5">
          <AnalyticsMatrix values={crowdPattern} compact />
          <GlassPanel className="p-4">
            <h2 className="text-lg font-black text-white">Peak Hour Signal</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Highest movement is concentrated near evening culture events and cafe-stage access.</p>
            <div className="mt-5 grid gap-3">
              <QueueFlowLane label="Crowd flow" count={84} tone="cyan" />
              <QueueFlowLane label="No-show index" count={18} tone="amber" />
              <QueueFlowLane label="Waitlist transfer" count={32} tone="violet" />
            </div>
          </GlassPanel>
          <GlassPanel className="p-4">
            <h2 className="text-lg font-black text-white">Crowd Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CompactMetric label="Peak" value="8 PM" tone="lime" />
              <CompactMetric label="Risk" value="Med" tone="amber" />
            </div>
          </GlassPanel>
        </aside>
      </section>
    </AppShell>
  );
}

