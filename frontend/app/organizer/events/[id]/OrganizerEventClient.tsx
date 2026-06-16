"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/Alert";
import { DataTable } from "@/components/DataTable";
import { ActivityTimeline, AnalyticsMatrix, CapacityRadar, GlassPanel, MetricOrb, QueueFlowLane } from "@/components/OpsUI";
import { get } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toUiEvent, unwrapData } from "@/lib/adapters";
import type { EventRecord } from "@/lib/data";

export function OrganizerEventClient({ fallbackEvent, fallbackRegistrations }: { fallbackEvent: EventRecord; fallbackRegistrations: any[] }) {
  const [event, setEvent] = useState(fallbackEvent);
  const [waitlistRows, setWaitlistRows] = useState<any[]>([]);
  const [checkInRows, setCheckInRows] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [timeRangeAnalytics, setTimeRangeAnalytics] = useState<any>(null);
  const [gateFlow, setGateFlow] = useState<any>(null);
  const [flowWindow, setFlowWindow] = useState<"15" | "30" | "full">("15");
  const [socketStatus, setSocketStatus] = useState("Live Sync Offline");
  const [error, setError] = useState("");

  async function refresh() {
    const [eventPayload, waitlistPayload, checkinsPayload, analyticsPayload, gateFlowPayload] = await Promise.all([
      get(`/api/events/${event.id}`),
      get(`/api/events/${event.id}/waitlist`).catch(() => null),
      get(`/api/events/${event.id}/checkins`).catch(() => null),
      get(`/api/analytics/events/${event.id}`).catch(() => null),
      get(`/api/events/${event.id}/gates/flow`).catch(() => null),
    ]);
    const details = unwrapData(eventPayload, "event") || unwrapData(eventPayload);
    setEvent(toUiEvent(details));
    const waitlist = unwrapData(waitlistPayload, "waitlist") || unwrapData(waitlistPayload, "entries") || unwrapData(waitlistPayload) || [];
    const checkins = unwrapData(checkinsPayload, "checkIns") || unwrapData(checkinsPayload, "checkins") || unwrapData(checkinsPayload) || [];
    setWaitlistRows(Array.isArray(waitlist) ? waitlist : []);
    setCheckInRows(Array.isArray(checkins) ? checkins : []);
    setAnalytics(unwrapData(analyticsPayload) || {});
    setGateFlow(unwrapData(gateFlowPayload) || null);
  }

  async function loadTimeRange(windowMode: "15" | "30" | "full") {
    const now = new Date();
    const endTime = windowMode === "full" ? new Date(event.endTime) : now;
    const startTime =
      windowMode === "full"
        ? new Date(event.startTime)
        : new Date(now.getTime() - Number(windowMode) * 60 * 1000);
    const params = new URLSearchParams({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      bucketMinutes: "5",
    });
    const payload = await get(`/api/analytics/events/${event.id}/time-range?${params.toString()}`);
    setTimeRangeAnalytics(unwrapData(payload));
  }

  useEffect(() => {
    let active = true;
    refresh().catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Control room sync failed. Showing cached event data.");
    });
    return () => {
      active = false;
    };
  }, [event.id]);

  useEffect(() => {
    loadTimeRange(flowWindow).catch(() => undefined);
  }, [event.id, flowWindow]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function connected() {
      setSocketStatus("Live Sync Active");
      socket.emit("join-event-room", { eventId: event.id });
    }

    function disconnected() {
      setSocketStatus("Reconnecting...");
    }

    function updateCapacity(payload: any) {
      if (payload?.eventId && payload.eventId !== event.id) return;
      setEvent((current) => ({
        ...current,
        registeredCount: Number(payload?.registeredCount ?? current.registeredCount),
        checkedInCount: Number(payload?.checkedInCount ?? current.checkedInCount),
        waitlistCount: Number(payload?.waitlistCount ?? current.waitlistCount),
        remainingSeats: Number(payload?.remainingSeats ?? (current as any).remainingSeats),
      }));
    }

    function addActivity(payload: any) {
      if (payload?.eventId && payload.eventId !== event.id) return;
      setCheckInRows((rows) => [{ id: `live-${Date.now()}`, ...payload, scannedAt: payload?.timestamp || new Date().toISOString() }, ...rows]);
      refresh().catch(() => undefined);
    }

    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", () => setSocketStatus("Live Sync Offline"));
    socket.on("capacity-updated", updateCapacity);
    socket.on("registration-updated", refresh);
    socket.on("waitlist-updated", refresh);
    socket.on("checkin-updated", addActivity);
    socket.on("entry-rate-updated", refresh);
    socket.on("no-show-released", refresh);
    if (socket.connected) connected();

    return () => {
      socket.emit("leave-event-room", { eventId: event.id });
      socket.off("connect", connected);
      socket.off("disconnect", disconnected);
      socket.off("capacity-updated", updateCapacity);
      socket.off("registration-updated", refresh);
      socket.off("waitlist-updated", refresh);
      socket.off("checkin-updated", addActivity);
      socket.off("entry-rate-updated", refresh);
      socket.off("no-show-released", refresh);
    };
  }, [event.id]);

  const remainingSeats = Math.max(Number((event as any).remainingSeats ?? event.capacity - event.registeredCount), 0);
  const entryRate = analytics.attendancePercentage ?? (event.registeredCount > 0 ? Math.round((event.checkedInCount / event.registeredCount) * 100) : 0);
  const registeredRows = fallbackRegistrations.filter((registration) => registration.status !== "Waitlisted");
  const waitlistTableRows = waitlistRows.length
    ? waitlistRows.map((entry: any) => ({
        attendee: entry.user?.name || entry.userId,
        pass: entry.registrationId || entry.id,
        status: entry.status,
        position: entry.position,
      }))
    : fallbackRegistrations.filter((registration) => registration.status === "Waitlisted");
  const checkInTimeline = useMemo(() => {
    const rows = checkInRows.length
      ? checkInRows.map((item: any) => ({ title: item.user?.name || item.student?.name || item.userId || "Live scan", meta: `${item.gateName || item.action || "Gate"} / ${item.scannedAt ? new Date(item.scannedAt).toLocaleString() : "now"}`, tone: "lime" as const }))
      : fallbackRegistrations.filter((registration) => registration.status === "Checked in").map(({ attendee, checkedInAt, status }) => ({ title: attendee, meta: `${status} / ${checkedInAt}`, tone: "lime" as const }));
    return rows;
  }, [checkInRows, fallbackRegistrations]);

  return (
    <>
      {error ? <div className="mb-5"><ErrorAlert title="Control room warning">{error}</ErrorAlert></div> : null}
      <p className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-cyan-100/60">{socketStatus}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricOrb label="Registered" value={String(event.registeredCount)} />
        <MetricOrb label="Checked in" value={String(event.checkedInCount)} tone="lime" />
        <MetricOrb label="Waitlist" value={String(event.waitlistCount)} tone="violet" />
        <MetricOrb label="Remaining" value={String(remainingSeats)} tone="amber" />
        <MetricOrb label="Entry rate" value={`${entryRate}%`} tone="cyan" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="grid gap-6">
          <GlassPanel>
            <h2 className="mb-4 text-xl font-black text-white">Registrations</h2>
            <DataTable columns={["attendee", "pass", "seat", "status"]} rows={registeredRows.map(({ attendee, pass, seat, status }) => ({ attendee, pass, seat, status }))} />
          </GlassPanel>
          <GlassPanel>
            <h2 className="mb-4 text-xl font-black text-white">Waitlist Queue Lane</h2>
            <QueueFlowLane label="Active queue" count={event.waitlistCount} />
            <div className="mt-5">
              <DataTable columns={["attendee", "pass", "status", "position"]} rows={waitlistTableRows.map(({ attendee, pass, status, position }) => ({ attendee, pass, status, position: position || "-" }))} />
            </div>
          </GlassPanel>
          <GlassPanel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-white">Entry Flow Window</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  ["15", "Last 15m"],
                  ["30", "Last 30m"],
                  ["full", "Full event"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFlowWindow(value as "15" | "30" | "full")}
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${flowWindow === value ? "border-cyan-300/45 bg-cyan-300/16 text-cyan-100" : "border-white/10 bg-white/5 text-white/55"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <MetricOrb label="Check-ins" value={String(timeRangeAnalytics?.checkinCount ?? 0)} tone="lime" />
              <AnalyticsMatrix values={(timeRangeAnalytics?.buckets || []).map((bucket: any) => Number(bucket.count) * 20).slice(0, 28)} compact />
            </div>
            <p className="mt-4 text-sm text-white/55">
              Peak window: {timeRangeAnalytics?.peakWindow ? `${new Date(timeRangeAnalytics.peakWindow.startTime).toLocaleTimeString()} / ${timeRangeAnalytics.peakWindow.count} scans` : "No bucketed check-ins yet"}
            </p>
          </GlassPanel>
          <ActivityTimeline items={checkInTimeline} />
        </section>
        <aside className="grid h-fit gap-6">
          <CapacityRadar current={event.registeredCount} capacity={event.capacity} />
          <GlassPanel>
            <h2 className="text-xl font-black text-white">Gate Status Cards</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["Main", "North", "Overflow", "Staff"].map((gate, index) => (
                <div key={gate} className="rounded-xl border border-white/10 bg-white/6 p-4">
                  <p className="text-sm text-white/55">{gate}</p>
                  <p className="mt-1 text-xl font-black text-white">{index === 2 && event.waitlistCount > 0 ? "Queue" : "Open"}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-dashed border-cyan-300/25 bg-cyan-300/8 p-4">
              <p className="text-sm text-white/55">Entry rate</p>
              <p className="mt-1 text-2xl font-black text-white">{entryRate}%</p>
              <p className="mt-2 text-sm text-white/50">Peak hour: {analytics.peakCheckinHour?.hour ? new Date(analytics.peakCheckinHour.hour).toLocaleTimeString() : "-"}</p>
            </div>
          </GlassPanel>
          <GlassPanel>
            <h2 className="text-xl font-black text-white">Gate Load Map</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{gateFlow?.reason || "Gate flow route sync pending."}</p>
            <div className="mt-5 grid gap-3">
              {(gateFlow?.gates || []).map((gate: any) => (
                <div key={gate.id} className={`relative rounded-xl border p-4 ${gateFlow?.recommendedGate?.id === gate.id ? "border-lime/35 bg-lime/10 shadow-[0_0_24px_rgba(163,230,53,0.12)]" : "border-white/10 bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{gate.name}</p>
                      <p className="text-xs text-white/50">{gate.zone}</p>
                    </div>
                    <p className="text-2xl font-black text-white">{gate.load}</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${Math.min(100, gate.load * 12 + gate.distanceWeight * 8)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {gateFlow?.routeToVenue?.path?.length ? (
              <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">
                Route: {gateFlow.routeToVenue.path.join(" -> ")}
              </p>
            ) : null}
          </GlassPanel>
        </aside>
      </div>
    </>
  );
}
