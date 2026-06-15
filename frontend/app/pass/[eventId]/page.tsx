import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { events } from "@/lib/data";

export default async function PassPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = events.find((item) => item.id === eventId);
  if (!event) notFound();

  return (
    <AppShell>
      <PageHeader title="Your event pass" eyebrow="QR check-in" />
      <div className="mx-auto max-w-md rounded-lg border border-ink/10 bg-white p-6 text-center shadow-soft">
        <div className="mx-auto grid aspect-square w-56 grid-cols-6 gap-2 rounded-lg bg-white p-4 ring-1 ring-ink/10">
          {Array.from({ length: 36 }).map((_, index) => (
            <span key={index} className={`rounded-sm ${index % 3 === 0 || index % 7 === 0 ? "bg-ink" : "bg-mist"}`} />
          ))}
        </div>
        <h2 className="mt-6 text-2xl font-bold">{event.title}</h2>
        <p className="mt-2 text-ink/60">{event.date} · {event.time}</p>
        <p className="mt-1 text-ink/60">{event.venue}</p>
        <div className="mt-6 rounded-md bg-mist p-4 text-sm font-bold tracking-[0.18em] text-ink/70">EP-{event.id.toUpperCase().slice(0, 8)}</div>
      </div>
    </AppShell>
  );
}

