import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { PageHeader } from "@/components/PageHeader";

export default function NewEventPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Create event" eyebrow="Organizer" />
      <form className="grid max-w-3xl gap-5 rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <FormInput label="Event title" placeholder="Campus Innovation Expo" />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Date" type="date" />
          <FormInput label="Time" type="time" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Venue" placeholder="Main Auditorium" />
          <FormInput label="Capacity" type="number" placeholder="250" />
        </div>
        <label className="grid gap-2 text-sm font-semibold text-ink/75">
          Description
          <textarea className="min-h-32 rounded-md border border-ink/15 bg-white px-3 py-3 outline-none focus:border-campus focus:ring-4 focus:ring-campus/10" placeholder="Describe the event experience." />
        </label>
        <Button type="button" className="w-full sm:w-fit">Save draft</Button>
      </form>
    </AppShell>
  );
}

