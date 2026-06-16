import { AppShell } from "@/components/AppShell";
import { NeonButton } from "@/components/NeonButton";
import { ControlChip, GlassPanel, StatusBeacon } from "@/components/OpsUI";
import { PageHeader } from "@/components/PageHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { events } from "@/lib/data";

export default function PassesPage() {
  const passEvents = events.slice(0, 3);

  return (
    <ProtectedRoute>
      <AppShell>
        <PageHeader title="My Access Passes" eyebrow="Student" />
        <div className="grid gap-5 md:grid-cols-3">
          {passEvents.map((event, index) => (
            <GlassPanel key={event.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <ControlChip tone={index === 0 ? "lime" : "cyan"}>Seat A-{index + 12}</ControlChip>
                <h2 className="mt-4 text-2xl font-black text-white">{event.title}</h2>
              </div>
              <StatusBeacon status={index === 0 ? "live" : "open"} />
            </div>
            <p className="mt-4 text-sm text-white/58">{event.venue}</p>
            <NeonButton href={`/pass/${event.id}`} variant="ghost" className="mt-5 w-full">
              View Pass
            </NeonButton>
            </GlassPanel>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
