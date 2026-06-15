import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { registrations } from "@/data/registrations";
import { VolunteerScanClient } from "./VolunteerScanClient";

export default function VolunteerScanPage() {
  return (
    <AppShell sidebar>
      <PageHeader title="Scan passes" eyebrow="Volunteer station" />
      <VolunteerScanClient initialScans={registrations} />
    </AppShell>
  );
}

