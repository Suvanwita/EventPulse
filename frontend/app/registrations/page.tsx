import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { registrations } from "@/data/registrations";

export default function RegistrationsPage() {
  return (
    <AppShell>
      <PageHeader title="My registrations" eyebrow="Student" />
      <DataTable columns={["event", "pass", "status"]} rows={registrations.map(({ event, pass, status }) => ({ event, pass, status }))} />
    </AppShell>
  );
}

