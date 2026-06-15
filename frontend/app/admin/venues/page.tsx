import { AppShell } from "@/components/AppShell";
import { FormInput } from "@/components/FormInput";
import { NeonButton } from "@/components/NeonButton";
import { GlassPanel, VenueMapGrid } from "@/components/OpsUI";
import { PageHeader } from "@/components/PageHeader";
import { venues } from "@/lib/data";

export default function AdminVenuesPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Venue Grid" eyebrow="Admin" />
      <GlassPanel className="mb-8">
        <h2 className="mb-5 text-xl font-black text-white">Create Infrastructure Node</h2>
        <form className="grid gap-5 lg:grid-cols-2">
          <FormInput label="Venue name" placeholder="Main Auditorium" />
          <FormInput label="Location" placeholder="Student Center, West Wing" />
          <FormInput label="Capacity" type="number" placeholder="300" />
          <FormInput label="Rows" type="number" placeholder="15" />
          <FormInput label="Seats per row" type="number" placeholder="20" />
          <div className="flex items-end">
            <NeonButton type="button" className="w-full lg:w-fit">Save Venue</NeonButton>
          </div>
        </form>
      </GlassPanel>
      <VenueMapGrid venues={venues} />
    </AppShell>
  );
}
