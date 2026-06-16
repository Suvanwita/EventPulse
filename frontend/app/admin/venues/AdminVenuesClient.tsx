"use client";

import { useEffect, useState } from "react";
import { ErrorAlert, SuccessAlert } from "@/components/Alert";
import { FormInput } from "@/components/FormInput";
import { NeonButton } from "@/components/NeonButton";
import { GlassPanel, VenueMapGrid } from "@/components/OpsUI";
import { get, post } from "@/lib/api";
import { toUiVenue, unwrapData } from "@/lib/adapters";
import type { VenueRecord } from "@/lib/data";

const initialForm = {
  name: "",
  location: "",
  zone: "",
  capacity: "100",
  rows: "10",
  seatsPerRow: "10",
};

export function AdminVenuesClient({ fallbackVenues }: { fallbackVenues: VenueRecord[] }) {
  const [venues, setVenues] = useState(fallbackVenues);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadVenues() {
    const payload = await get("/api/venues");
    const records = unwrapData(payload, "venues");
    if (Array.isArray(records)) setVenues(records.map(toUiVenue));
  }

  useEffect(() => {
    loadVenues().catch((err) => setError(err instanceof Error ? err.message : "Venue API unreachable. Showing cached infrastructure grid."));
  }, []);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      await post("/api/venues", {
        name: form.name.trim(),
        location: form.location.trim(),
        zone: form.zone.trim(),
        capacity: Number(form.capacity),
        rows: Number(form.rows),
        seatsPerRow: Number(form.seatsPerRow),
      });
      setNotice("Venue node saved.");
      setForm(initialForm);
      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save venue.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <GlassPanel className="mb-8">
        <h2 className="mb-5 text-xl font-black text-white">Create Infrastructure Node</h2>
        {error ? <div className="mb-5"><ErrorAlert title="Venue warning">{error}</ErrorAlert></div> : null}
        {notice ? <div className="mb-5"><SuccessAlert title="Venue saved">{notice}</SuccessAlert></div> : null}
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <FormInput label="Venue name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Main Auditorium" required />
          <FormInput label="Location" value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Student Center, West Wing" required />
          <FormInput label="Zone" value={form.zone} onChange={(event) => updateField("zone", event.target.value)} placeholder="AUD-A" required />
          <FormInput label="Capacity" type="number" value={form.capacity} onChange={(event) => updateField("capacity", event.target.value)} min={1} required />
          <FormInput label="Rows" type="number" value={form.rows} onChange={(event) => updateField("rows", event.target.value)} min={1} required />
          <FormInput label="Seats per row" type="number" value={form.seatsPerRow} onChange={(event) => updateField("seatsPerRow", event.target.value)} min={1} required />
          <div className="flex items-end">
            <NeonButton type="submit" disabled={isSaving} className="w-full lg:w-fit">{isSaving ? "Saving..." : "Save Venue"}</NeonButton>
          </div>
        </form>
      </GlassPanel>
      <VenueMapGrid venues={venues} />
    </>
  );
}

