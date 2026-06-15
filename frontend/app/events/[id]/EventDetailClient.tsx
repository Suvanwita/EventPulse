"use client";

import { useMemo, useState } from "react";
import { NeonButton } from "@/components/NeonButton";
import { CapacityRadar, ControlChip, CrowdHeatBar, GlassPanel, QueueFlowLane, StatusBeacon } from "@/components/OpsUI";
import type { EventRecord, VenueRecord } from "@/lib/data";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function EventDetailClient({ event, venue }: { event: EventRecord; venue?: VenueRecord }) {
  const [registeredCount, setRegisteredCount] = useState(event.registeredCount);
  const [waitlistCount, setWaitlistCount] = useState(event.waitlistCount);
  const [registrationState, setRegistrationState] = useState<"none" | "registered" | "waitlisted">("none");

  const remainingSeats = Math.max(event.capacity - registeredCount, 0);
  const crowdLevel = Math.round((registeredCount / event.capacity) * 100);
  const canRegister = remainingSeats > 0 && event.status !== "closed";

  const localStatus = useMemo(() => {
    if (event.status === "closed") return "closed";
    if (event.status === "live") return "live";
    if (remainingSeats === 0) return "waitlist";
    if (registeredCount / event.capacity >= 0.75) return "filling";
    return "open";
  }, [event.capacity, event.status, registeredCount, remainingSeats]);

  function register() {
    if (!canRegister || registrationState === "registered") return;
    if (registrationState === "waitlisted") setWaitlistCount((count) => Math.max(count - 1, 0));
    setRegisteredCount((count) => Math.min(count + 1, event.capacity));
    setRegistrationState("registered");
  }

  function joinWaitlist() {
    if (registrationState === "waitlisted") return;
    if (registrationState === "registered") setRegisteredCount((count) => Math.max(count - 1, 0));
    setWaitlistCount((count) => count + 1);
    setRegistrationState("waitlisted");
  }

  function cancelRegistration() {
    if (registrationState === "registered") setRegisteredCount((count) => Math.max(count - 1, 0));
    if (registrationState === "waitlisted") setWaitlistCount((count) => Math.max(count - 1, 0));
    setRegistrationState("none");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-6">
        <GlassPanel className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <ControlChip>{event.category}</ControlChip>
              <h2 className="mt-4 text-4xl font-black uppercase tracking-wide text-white">{event.title}</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">{event.description}</p>
            </div>
            <StatusBeacon status={localStatus} />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Start</p><p className="mt-1 font-black text-white">{formatDateTime(event.startTime)}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">End</p><p className="mt-1 font-black text-white">{formatDateTime(event.endTime)}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Venue zone</p><p className="mt-1 font-black text-white">{venue ? `${venue.name} / ${venue.room}` : event.venue}</p></div>
          </div>
        </GlassPanel>

        <div className="grid gap-6 lg:grid-cols-2">
          <CapacityRadar current={registeredCount} capacity={event.capacity} />
          <GlassPanel>
            <h2 className="text-xl font-black text-white">Crowd Pressure</h2>
            <div className="mt-5 grid gap-5">
              <CrowdHeatBar value={crowdLevel} />
              <QueueFlowLane label="Waitlist pressure" count={waitlistCount} />
              <QueueFlowLane label="Remaining seats" count={remainingSeats} tone="lime" />
            </div>
          </GlassPanel>
        </div>
      </div>

      <GlassPanel className="h-fit">
        <h2 className="text-xl font-black text-white">Registration Actions</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Registered</p><p className="text-2xl font-black text-white">{registeredCount}</p></div>
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Checked in</p><p className="text-2xl font-black text-white">{event.checkedInCount}</p></div>
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Waitlist</p><p className="text-2xl font-black text-white">{waitlistCount}</p></div>
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Remaining</p><p className="text-2xl font-black text-white">{remainingSeats}</p></div>
        </div>
        <div className="mt-6 grid gap-3">
          <NeonButton type="button" onClick={register} disabled={!canRegister || registrationState === "registered"}>Register</NeonButton>
          <NeonButton type="button" variant="secondary" onClick={joinWaitlist} disabled={registrationState === "waitlisted"}>Join Waitlist</NeonButton>
          <NeonButton type="button" variant="danger" onClick={cancelRegistration} disabled={registrationState === "none"}>Cancel</NeonButton>
          <NeonButton href={`/pass/${event.id}`} variant="ghost">View Pass</NeonButton>
        </div>
      </GlassPanel>
    </div>
  );
}

