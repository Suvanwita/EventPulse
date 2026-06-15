import { AppShell } from "@/components/AppShell";
import { FormInput } from "@/components/FormInput";
import { NeonButton } from "@/components/NeonButton";
import { GlassPanel } from "@/components/OpsUI";
import { PageHeader } from "@/components/PageHeader";

export default function NewEventPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Event Launch Configuration" eyebrow="Organizer" />
      <form className="grid gap-6">
        <GlassPanel>
          <h2 className="mb-5 text-xl font-black text-white">Event Identity</h2>
          <div className="grid gap-5">
            <FormInput label="Title" placeholder="Campus Innovation Expo" />
            <label className="grid gap-2 text-sm font-bold text-white/75">
              Description
              <textarea className="min-h-32 rounded-xl border border-cyan-200/14 bg-white/6 px-3 py-3 text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10" placeholder="Describe the event signal." />
            </label>
          </div>
        </GlassPanel>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel>
            <h2 className="mb-5 text-xl font-black text-white">Venue Assignment</h2>
            <FormInput label="Venue" placeholder="Main Auditorium" />
          </GlassPanel>
          <GlassPanel>
            <h2 className="mb-5 text-xl font-black text-white">Capacity Rules</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput label="Capacity" type="number" placeholder="250" />
              <FormInput label="Waitlist capacity" type="number" placeholder="50" />
            </div>
          </GlassPanel>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel>
            <h2 className="mb-5 text-xl font-black text-white">Registration Window</h2>
            <div className="grid gap-5">
              <FormInput label="Start time" type="datetime-local" />
              <FormInput label="End time" type="datetime-local" />
              <FormInput label="Registration deadline" type="datetime-local" />
            </div>
          </GlassPanel>
          <GlassPanel>
            <h2 className="mb-5 text-xl font-black text-white">Launch Status</h2>
            <label className="grid gap-2 text-sm font-bold text-white/75">
              Status
              <select className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none transition focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10">
                <option value="open">open</option>
                <option value="filling">filling</option>
                <option value="waitlist">waitlist</option>
                <option value="closed">closed</option>
              </select>
            </label>
            <NeonButton type="button" className="mt-6 w-full">Launch Event</NeonButton>
          </GlassPanel>
        </div>
      </form>
    </AppShell>
  );
}

