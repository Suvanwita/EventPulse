import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { PageHeader } from "@/components/PageHeader";

export default function NewEventPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Create event" eyebrow="Organizer" />
      <form className="grid max-w-3xl gap-5 rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <FormInput label="Title" placeholder="Campus Innovation Expo" />
        <label className="grid gap-2 text-sm font-semibold text-ink/75">
          Description
          <textarea className="min-h-32 rounded-md border border-ink/15 bg-white px-3 py-3 outline-none focus:border-campus focus:ring-4 focus:ring-campus/10" placeholder="Describe the event experience." />
        </label>
        <FormInput label="Venue" placeholder="Main Auditorium" />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Start time" type="datetime-local" />
          <FormInput label="End time" type="datetime-local" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Capacity" type="number" placeholder="250" />
          <FormInput label="Waitlist capacity" type="number" placeholder="50" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Registration deadline" type="datetime-local" />
          <label className="grid gap-2 text-sm font-semibold text-ink/75">
            Status
            <select className="min-h-11 rounded-md border border-ink/15 bg-white px-3 text-ink outline-none transition focus:border-campus focus:ring-4 focus:ring-campus/10">
              <option value="open">open</option>
              <option value="filling">filling</option>
              <option value="waitlist">waitlist</option>
              <option value="closed">closed</option>
            </select>
          </label>
        </div>
        <Button type="button" className="w-full sm:w-fit">Save event</Button>
      </form>
    </AppShell>
  );
}
