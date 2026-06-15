import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { CapacityBar } from "@/components/CapacityBar";
import { EventCard } from "@/components/EventCard";
import { StatCard } from "@/components/StatCard";
import { events, stats } from "@/lib/data";

const features = [
  "Live venue capacity signals",
  "QR passes for fast check-in",
  "Automatic waitlist movement",
  "Crowd trend dashboards",
];

export default function Home() {
  return (
    <AppShell>
      <section className="grid min-h-[76vh] items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-campus">Campus operations in real time</p>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-ink sm:text-6xl">
            EventPulse keeps campus events moving without crowding the doors.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/65">
            Manage capacity, issue QR passes, move waitlists, and track real-time crowd flow from one clean campus command center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/events">Browse events</Button>
            <Button href="/organizer/dashboard" variant="ghost">View dashboard</Button>
          </div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-campus">Now tracking</p>
              <h2 className="text-2xl font-bold">Founders Night</h2>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">Filling</span>
          </div>
          <CapacityBar current={214} capacity={280} />
          <div className="mt-6 grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div key={feature} className="rounded-md bg-mist p-4 text-sm font-semibold text-ink/75">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>
      <section className="mt-12 grid gap-5 md:grid-cols-3">
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </section>
    </AppShell>
  );
}

