import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormInput } from "@/components/FormInput";
import { PageHeader } from "@/components/PageHeader";
import { venues } from "@/lib/data";

export default function AdminVenuesPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Venue management" eyebrow="Admin" />
      <section className="mb-8 rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <h2 className="mb-5 text-xl font-bold">Create venue</h2>
        <form className="grid gap-5 lg:grid-cols-2">
          <FormInput label="Venue name" placeholder="Main Auditorium" />
          <FormInput label="Location" placeholder="Student Center, West Wing" />
          <FormInput label="Capacity" type="number" placeholder="300" />
          <FormInput label="Rows" type="number" placeholder="15" />
          <FormInput label="Seats per row" type="number" placeholder="20" />
          <div className="flex items-end">
            <Button type="button" className="w-full lg:w-fit">Save venue</Button>
          </div>
        </form>
      </section>
      <DataTable
        columns={["name", "capacity", "rows", "seatsPerRow", "location"]}
        rows={venues.map(({ name, capacity, rows, seatsPerRow, location }) => ({ name, capacity, rows, seatsPerRow, location }))}
      />
    </AppShell>
  );
}
