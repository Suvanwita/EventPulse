import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { events, stats } from "@/lib/data";

export default function OrganizerDashboardPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Organizer dashboard" eyebrow="Today">
        <Button href="/organizer/events/new">Create event</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <div className="mt-8">
        <DataTable
          columns={["title", "venue", "checkedInCount", "capacity", "waitlistCount"]}
          rows={events.map(({ title, venue, checkedInCount, capacity, waitlistCount }) => ({ title, venue, checkedInCount, capacity, waitlistCount }))}
        />
      </div>
    </AppShell>
  );
}
