import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { scans } from "@/lib/data";

export default function VolunteerScanPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Scan passes" eyebrow="Volunteer station" />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <div className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-campus/30 bg-mist text-center">
            <div>
              <p className="text-lg font-bold">Camera preview</p>
              <p className="mt-2 text-sm text-ink/55">Dummy scanner state</p>
            </div>
          </div>
          <Button type="button" className="mt-5 w-full">Simulate scan</Button>
        </section>
        <DataTable columns={["attendee", "pass", "event", "status"]} rows={scans} />
      </div>
    </AppShell>
  );
}

