"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/Alert";
import { DataTable } from "@/components/DataTable";
import { NeonButton } from "@/components/NeonButton";
import { ActivityTimeline, EventRadarCard, GlassPanel, MetricOrb, QueueFlowLane } from "@/components/OpsUI";
import { get } from "@/lib/api";
import { toUiEvent, unwrapData } from "@/lib/adapters";
import type { EventRecord } from "@/lib/data";

export function OrganizerDashboardClient({ fallbackEvents }: { fallbackEvents: EventRecord[] }) {
  const [events, setEvents] = useState(fallbackEvents);
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setIsSyncing(true);
      setError("");
      try {
        const payload = await get("/api/events?createdByMe=true");
        const records = unwrapData(payload, "events");
        if (active) setEvents(Array.isArray(records) ? records.map(toUiEvent) : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Organizer event sync failed. Showing cached events.");
      } finally {
        if (active) setIsSyncing(false);
      }
    }

    loadEvents();
    return () => {
      active = false;
    };
  }, []);

  const { metrics, attendance, waitlistPressure } = useMemo(() => {
    const totalEvents = events.length;
    const liveEvents = events.filter((event) => event.status === "live").length;
    const openEvents = events.filter((event) => event.status === "open" || event.status === "filling").length;
    const totalRegistrations = events.reduce((total, event) => total + event.registeredCount, 0);
    const totalCheckIns = events.reduce((total, event) => total + event.checkedInCount, 0);
    const waitlistPressure = events.reduce((total, event) => total + event.waitlistCount, 0);

    return {
      metrics: [
        { label: "Events", value: String(totalEvents) },
        { label: "Live / open", value: `${liveEvents}/${openEvents}` },
        { label: "Registrations", value: totalRegistrations.toLocaleString() },
        { label: "Check-ins", value: totalCheckIns.toLocaleString() },
        { label: "Waitlist", value: waitlistPressure.toLocaleString() },
      ],
      attendance: totalRegistrations ? Math.round((totalCheckIns / totalRegistrations) * 100) : 0,
      waitlistPressure,
    };
  }, [events]);

  return (
    <>
      <div className="mb-6 flex justify-end">
        <NeonButton href="/organizer/events/new">Create Event</NeonButton>
      </div>
      {error ? <div className="mb-5"><ErrorAlert title="Dashboard sync warning">{error}</ErrorAlert></div> : null}
      {isSyncing ? <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/60">Dashboard syncing...</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((stat, index) => <MetricOrb key={stat.label} label={stat.label} value={String(stat.value)} tone={index === 1 ? "lime" : index === 2 ? "violet" : index === 3 ? "amber" : "cyan"} />)}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5 lg:grid-cols-2">
          {events.slice(0, 4).map((event) => <EventRadarCard key={event.id} event={event} />)}
        </div>
        <div className="grid gap-6">
          <GlassPanel>
            <h2 className="text-xl font-black text-white">Crowd Pressure Summary</h2>
            <div className="mt-5 grid gap-4">
              <QueueFlowLane label="Waitlist pressure" count={waitlistPressure} tone="violet" />
              <QueueFlowLane label="Attendance pulse" count={attendance} tone="lime" />
            </div>
          </GlassPanel>
          <ActivityTimeline items={events.slice(0, 4).map((event) => ({ title: event.title, meta: `${event.venue} / ${event.status}`, tone: event.status === "live" ? "lime" : event.status === "waitlist" ? "violet" : "cyan" }))} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-black text-white">Recent Events Table</h2>
        <DataTable
          columns={["title", "venue", "status", "registeredCount", "checkedInCount", "capacity"]}
          rows={events.map(({ title, venue, status, registeredCount, checkedInCount, capacity }) => ({ title, venue, status, registeredCount, checkedInCount, capacity }))}
        />
      </div>
    </>
  );
}
