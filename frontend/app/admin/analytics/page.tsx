import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { stats, venues } from "@/lib/data";

export default function AdminAnalyticsPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Campus analytics" eyebrow="Admin" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <DataTable
          columns={["name", "capacity", "occupancy"]}
          rows={venues.map(({ name, capacity, occupancy }) => ({ name, capacity, occupancy: `${occupancy}%` }))}
        />
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Crowd pattern</h2>
          <div className="mt-6 flex h-56 items-end gap-3">
            {[44, 58, 72, 91, 83, 67, 49].map((height, index) => (
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

