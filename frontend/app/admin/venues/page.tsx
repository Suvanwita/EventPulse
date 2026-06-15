import { AppShell } from "@/components/AppShell";
import { CapacityBar } from "@/components/CapacityBar";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { venues } from "@/lib/data";

export default function AdminVenuesPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Venue capacity" eyebrow="Admin" />
      <div className="grid gap-5 md:grid-cols-2">
        {venues.map((venue) => (
          <section key={venue.name} className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{venue.name}</h2>
                <p className="mt-1 text-sm text-ink/55">{venue.capacity} max capacity</p>
              </div>
              <StatusBadge status={venue.status} />
            </div>
            <CapacityBar current={Math.round((venue.occupancy / 100) * venue.capacity)} capacity={venue.capacity} />
          </section>
        ))}
      </div>
    </AppShell>
  );
}

