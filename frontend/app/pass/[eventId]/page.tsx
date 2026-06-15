import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { AccessPassCard } from "@/components/OpsUI";
import { events } from "@/lib/data";

export default async function PassPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = events.find((item) => item.id === eventId);
  if (!event) notFound();

  return (
    <AppShell>
      <PageHeader title="Digital Access Badge" eyebrow="Encrypted QR pass" />
      <AccessPassCard event={event} />
      <p className="mx-auto mt-5 max-w-3xl rounded-2xl border border-amber/20 bg-amber/10 p-4 text-sm font-bold text-amber">
        Validity warning: this visual QR placeholder expires 15 minutes after the gate window closes. Real QR generation is not enabled yet.
      </p>
    </AppShell>
  );
}

