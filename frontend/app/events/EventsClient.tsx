"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import type { EventRecord } from "@/lib/data";

export function EventsClient({ events }: { events: EventRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

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

      {filteredEvents.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <EmptyState title="No events match those filters">Try a different search term, status, or category.</EmptyState>
      )}
    </div>
  );
}
