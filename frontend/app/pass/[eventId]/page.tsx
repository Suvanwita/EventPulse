import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { events } from "@/lib/data";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function PassPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = events.find((item) => item.id === eventId);
  if (!event) notFound();
  const seatNumber = `A-${event.id.length + 14}`;

  return (
    <AppShell>
      <PageHeader title="Your event pass" eyebrow="QR check-in" />
      <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <div className="grid aspect-square w-full max-w-56 shrink-0 grid-cols-7 gap-2 rounded-lg bg-white p-4 ring-1 ring-ink/10 sm:w-56">
            {Array.from({ length: 49 }).map((_, index) => (
              <span key={index} className={`rounded-sm ${index % 3 === 0 || index % 7 === 0 || index % 11 === 0 ? "bg-ink" : "bg-mist"}`} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-campus">EventPulse Pass</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">{event.title}</h2>
              </div>
              <StatusBadge status={event.status === "closed" ? "waitlist" : "open"} />
            </div>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="rounded-md bg-mist p-3">
                <p className="text-ink/55">Student name</p>
                <p className="font-bold text-ink">Jordan Lee</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-mist p-3">
                  <p className="text-ink/55">Venue</p>
                  <p className="font-bold text-ink">{event.venue}</p>
                </div>
                <div className="rounded-md bg-mist p-3">
                  <p className="text-ink/55">Seat number</p>
                  <p className="font-bold text-ink">{seatNumber}</p>
                </div>
              </div>
              <div className="rounded-md bg-mist p-3">
                <p className="text-ink/55">Date/time</p>
                <p className="font-bold text-ink">{formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}</p>
              </div>
              <div className="rounded-md bg-mist p-3">
                <p className="text-ink/55">Status</p>
                <p className="font-bold text-ink">{event.status === "closed" ? "Waitlist pending" : "Confirmed"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-ink/10 bg-amber-50 px-6 py-4 text-sm font-semibold text-amber-800">
          This QR placeholder expires 15 minutes after event check-in closes. Real QR generation is not enabled yet.
        </div>
      </div>
    </AppShell>
  );
}
