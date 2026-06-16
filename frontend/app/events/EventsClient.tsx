"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/Alert";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { LoadingState } from "@/components/LoadingState";
import { GlassPanel, StatusBeacon } from "@/components/OpsUI";
import { get } from "@/lib/api";
import { toUiEvent, unwrapData } from "@/lib/adapters";
import type { EventRecord } from "@/lib/data";

export function EventsClient({ events: fallbackEvents }: { events: EventRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [events, setEvents] = useState<EventRecord[]>(fallbackEvents);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("search", query.trim());
        if (status !== "all") params.set("status", status.toUpperCase());
        params.set("upcoming", "true");

        const payload = await get(`/api/events?${params.toString()}`, { signal: controller.signal });
        const records = unwrapData(payload, "events");
        setEvents(Array.isArray(records) ? records.map(toUiEvent) : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setEvents(fallbackEvents);
        setError(err instanceof Error ? err.message : "Event API is unreachable. Showing cached radar data.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    const timer = window.setTimeout(loadEvents, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fallbackEvents, query, status]);

  const statuses = useMemo(() => ["all", ...Array.from(new Set(events.map((event) => event.status)))], [events]);
  const categories = useMemo(() => ["all", ...Array.from(new Set(events.map((event) => event.category)))], [events]);

  const filteredEvents = events.filter((event) => {
    const matchesQuery = [event.title, event.description, event.venue, event.category].join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || event.status === status;
    const matchesCategory = category === "all" || event.category === category;

    return matchesQuery && matchesStatus && matchesCategory;
  });

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-2xl border border-cyan-200/12 bg-panel p-4 shadow-soft backdrop-blur-xl md:grid-cols-[1fr_180px_200px]">
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, venue, or category"
            className="min-h-11 rounded-xl border border-cyan-200/14 bg-white/6 px-3 text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 capitalize text-white outline-none focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
          >
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
          >
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      {isLoading ? (
        <GlassPanel>
          <div className="flex items-center justify-between gap-4">
            <LoadingState label="Syncing event radar" />
            <StatusBeacon status="live" label="syncing" />
          </div>
        </GlassPanel>
      ) : null}

      {error ? (
        <ErrorAlert title="System warning">{error}</ErrorAlert>
      ) : null}

      {filteredEvents.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <EmptyState title="Inactive radar panel">No live backend events match those filters.</EmptyState>
      )}
    </div>
  );
}
