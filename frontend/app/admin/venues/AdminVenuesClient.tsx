"use client";

import { useEffect, useState } from "react";
import { ErrorAlert, SuccessAlert } from "@/components/Alert";
import { FormInput } from "@/components/FormInput";
import { NeonButton } from "@/components/NeonButton";
import { GlassPanel, VenueMapGrid } from "@/components/OpsUI";
import { get, post } from "@/lib/api";
import { toUiVenue, unwrapData } from "@/lib/adapters";
import { useAutocomplete } from "@/lib/useAutocomplete";
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
  const [venueQuery, setVenueQuery] = useState("");
  const [highlightedVenueId, setHighlightedVenueId] = useState("");
  const { suggestions } = useAutocomplete(venueQuery, { limit: 8 });

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
      <GlassPanel className="mb-8">
        <label className="relative grid gap-2 text-sm font-bold text-white/75">
          Venue search autocomplete
          <input
            value={venueQuery}
            onChange={(event) => {
              setVenueQuery(event.target.value);
              setHighlightedVenueId("");
            }}
            placeholder="Search venue name or zone"
            className="min-h-11 rounded-xl border border-cyan-200/14 bg-white/6 px-3 text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
          />
          {suggestions.filter((suggestion: any) => ["VENUE", "ZONE"].includes(suggestion.type)).length > 0 ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 grid gap-2 rounded-2xl border border-cyan-200/16 bg-void/95 p-3 shadow-glow backdrop-blur-xl">
              {suggestions.filter((suggestion: any) => ["VENUE", "ZONE"].includes(suggestion.type)).map((suggestion: any, index) => (
                <button
                  key={`${suggestion.label}-${index}`}
                  type="button"
                  onClick={() => {
                    setVenueQuery(suggestion.label);
                    setHighlightedVenueId(suggestion.metadata?.venueId || "");
                  }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                >
                  <span className="font-black text-white">{suggestion.label}</span>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{suggestion.type}</span>
                </button>
              ))}
            </div>
          ) : null}
        </label>
      </GlassPanel>
      <VenueMapGrid venues={highlightedVenueId ? venues.filter((venue) => venue.id === highlightedVenueId) : venues.filter((venue) => [venue.name, venue.room, venue.location].join(" ").toLowerCase().includes(venueQuery.toLowerCase()))} />
    </>
  );
}
