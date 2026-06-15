import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { CapacityBar } from "@/components/CapacityBar";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { events } from "@/lib/data";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();

  return (
    <AppShell>
      <PageHeader title={event.title} eyebrow={event.category}>
        <StatusBadge status={event.status} />
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
          <div className="h-64" style={{ background: event.image }} />
          <div className="grid gap-5 p-6">
            <p className="text-lg leading-8 text-ink/70">{event.description}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Date</p><p className="font-bold">{event.date}</p></div>
              <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Time</p><p className="font-bold">{event.time}</p></div>
              <div className="rounded-md bg-mist p-4"><p className="text-sm text-ink/55">Venue</p><p className="font-bold">{event.venue}</p></div>
            </div>
          </div>
        </section>
        <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Availability</h2>
          <div className="mt-5"><CapacityBar current={event.checkedIn} capacity={event.capacity} /></div>
          <div className="mt-6 grid gap-3 text-sm text-ink/65">
            <p><span className="font-bold text-ink">{event.capacity - event.checkedIn}</span> spaces remaining</p>
            <p><span className="font-bold text-ink">{event.waitlist}</span> people on waitlist</p>
          </div>
          <Button href={`/pass/${event.id}`} className="mt-6 w-full">Get QR pass</Button>
        </aside>
      </div>
    </AppShell>
  );
}

