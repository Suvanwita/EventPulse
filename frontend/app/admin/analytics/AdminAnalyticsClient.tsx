"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/Alert";
import { DataTable } from "@/components/DataTable";
import { AnalyticsMatrix, CompactMetric, GlassPanel, QueueFlowLane } from "@/components/OpsUI";
import { get } from "@/lib/api";
import { unwrapData } from "@/lib/adapters";
import type { EventRecord, VenueRecord } from "@/lib/data";

export function AdminAnalyticsClient({
  fallbackEvents,
  fallbackVenues,
  fallbackPattern,
}: {
  fallbackEvents: EventRecord[];
  fallbackVenues: VenueRecord[];
  fallbackPattern: number[];
}) {
  const [venueAnalytics, setVenueAnalytics] = useState<any[]>(fallbackVenues.map((venue) => ({
    venueId: venue.id,
    venueName: venue.name,
    capacity: venue.capacity,
    eventsHosted: 0,
    averageUtilization: venue.occupancy,
    conflictCount: 0,
  })));
  const [checkinAnalytics, setCheckinAnalytics] = useState<any>({ totalCheckins: 0, checkinsByHour: {}, checkinsByGate: {}, failedScanCount: 0 });
  const [timeRangeAnalytics, setTimeRangeAnalytics] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      try {
        const [venuesPayload, checkinsPayload] = await Promise.all([
          get("/api/analytics/venues"),
          get("/api/analytics/checkins"),
        ]);
        if (!active) return;
        setVenueAnalytics(unwrapData(venuesPayload, "venues") || []);
        setCheckinAnalytics(unwrapData(checkinsPayload) || {});
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Analytics API unreachable. Showing cached core signals.");
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const firstEvent = fallbackEvents[0];
    if (!firstEvent) return;

    const params = new URLSearchParams({
      startTime: firstEvent.startTime,
      endTime: firstEvent.endTime,
      bucketMinutes: "10",
    });
    get(`/api/analytics/events/${firstEvent.id}/time-range?${params.toString()}`)
      .then((payload) => setTimeRangeAnalytics(unwrapData(payload)))
      .catch(() => undefined);
  }, [fallbackEvents]);

  const checkinsByHour = checkinAnalytics.checkinsByHour || {};
  const checkinsByGate = checkinAnalytics.checkinsByGate || {};
  const peakHour = Object.entries(checkinsByHour).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const averageUtilization = venueAnalytics.length
    ? Math.round(venueAnalytics.reduce((total, venue) => total + Number(venue.averageUtilization || 0), 0) / venueAnalytics.length)
    : 0;
  const matrixValues = useMemo(() => {
    const values = Object.values(checkinsByHour).map((value) => Number(value) * 12);
    return values.length ? [...values, ...fallbackPattern].slice(0, 28) : fallbackPattern;
  }, [checkinsByHour, fallbackPattern]);
  const attendanceRows = fallbackEvents.map(({ title, venue, registeredCount, checkedInCount }) => ({
    title,
    venue,
    registered: registeredCount,
    checkedIn: checkedInCount,
    rate: `${registeredCount > 0 ? Math.round((checkedInCount / registeredCount) * 100) : 0}%`,
  }));

  return (
    <>
      {error ? <div className="mb-5"><ErrorAlert title="Analytics warning">{error}</ErrorAlert></div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CompactMetric label="Total check-ins" value={String(checkinAnalytics.totalCheckins || 0)} delta="Scanned entries" tone="cyan" />
        <CompactMetric label="Failed scans" value={String(checkinAnalytics.failedScanCount || 0)} delta="Rejected QR attempts" tone="amber" />
        <CompactMetric label="Avg utilization" value={`${averageUtilization}%`} delta="Venue mean" tone="lime" />
        <CompactMetric label="Peak hour" value={peakHour ? new Date(String(peakHour[0])).toLocaleTimeString([], { hour: "numeric" }) : "-"} delta={peakHour ? `${peakHour[1]} scans` : "No scans yet"} tone="violet" />
        <CompactMetric label="Venues" value={String(venueAnalytics.length)} delta="Infrastructure nodes" tone="cyan" />
      </div>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid min-w-0 gap-5">
          <GlassPanel className="min-w-0 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Venue Utilization</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/55">Infrastructure load</span>
            </div>
            <DataTable
              columns={["venueName", "capacity", "eventsHosted", "averageUtilization", "conflictCount"]}
              rows={venueAnalytics.map(({ venueName, capacity, eventsHosted, averageUtilization, conflictCount }) => ({ venueName, capacity, eventsHosted, averageUtilization: `${averageUtilization}%`, conflictCount }))}
            />
          </GlassPanel>

          <GlassPanel className="min-w-0 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Event Attendance</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/55">Registration to entry</span>
            </div>
            <DataTable columns={["title", "venue", "registered", "checkedIn", "rate"]} rows={attendanceRows} />
          </GlassPanel>

          <GlassPanel className="min-w-0 p-4">
            <h2 className="mb-4 text-lg font-black text-white">Gate Flow</h2>
            <DataTable columns={["gate", "checkins"]} rows={Object.entries(checkinsByGate).map(([gate, checkins]) => ({ gate, checkins: Number(checkins) }))} />
          </GlassPanel>

          <GlassPanel className="min-w-0 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Time-Range Flow</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/55">Fenwick buckets</span>
            </div>
            <DataTable
              columns={["startTime", "endTime", "count"]}
              rows={(timeRangeAnalytics?.buckets || []).map((bucket: any) => ({
                startTime: new Date(bucket.startTime).toLocaleTimeString(),
                endTime: new Date(bucket.endTime).toLocaleTimeString(),
                count: bucket.count,
              }))}
              emptyMessage="Bucketed entry flow appears after event check-ins are scanned."
            />
          </GlassPanel>
        </div>

        <aside className="grid h-fit gap-5">
          <AnalyticsMatrix values={matrixValues} compact />
          <GlassPanel className="p-4">
            <h2 className="text-lg font-black text-white">Peak Hour Signal</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{peakHour ? `Highest movement detected at ${new Date(String(peakHour[0])).toLocaleString()}.` : "No check-in pulse has been recorded yet."}</p>
            <div className="mt-5 grid gap-3">
              <QueueFlowLane label="Crowd flow" count={Number(peakHour?.[1] || 0)} tone="cyan" />
              <QueueFlowLane label="No-show index" count={Number(checkinAnalytics.failedScanCount || 0)} tone="amber" />
              <QueueFlowLane label="Venue load" count={averageUtilization} tone="violet" />
            </div>
          </GlassPanel>
          <GlassPanel className="p-4">
            <h2 className="text-lg font-black text-white">Peak Entry Window</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {timeRangeAnalytics?.peakWindow
                ? `${new Date(timeRangeAnalytics.peakWindow.startTime).toLocaleTimeString()} to ${new Date(timeRangeAnalytics.peakWindow.endTime).toLocaleTimeString()} / ${timeRangeAnalytics.peakWindow.count} scans`
                : "Waiting for Fenwick bucket data."}
            </p>
            <QueueFlowLane label="Range count" count={Number(timeRangeAnalytics?.checkinCount || 0)} tone="lime" />
          </GlassPanel>
        </aside>
      </section>
    </>
  );
}
