"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorAlert, SuccessAlert } from "@/components/Alert";
import { LoadingState } from "@/components/LoadingState";
import { NeonButton } from "@/components/NeonButton";
import { CapacityRadar, ControlChip, CrowdHeatBar, GlassPanel, QueueFlowLane, StatusBeacon } from "@/components/OpsUI";
import { get, post } from "@/lib/api";
import { toUiEvent, unwrapData } from "@/lib/adapters";
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
  const router = useRouter();
  const [currentEvent, setCurrentEvent] = useState(event);
  const [currentVenue, setCurrentVenue] = useState(venue);
  const [registeredCount, setRegisteredCount] = useState(event.registeredCount);
  const [waitlistCount, setWaitlistCount] = useState(event.waitlistCount);
  const [checkedInCount, setCheckedInCount] = useState(event.checkedInCount);
  const [registrationState, setRegistrationState] = useState<"none" | "registered" | "waitlisted" | "checked-in">("none");
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    const [eventPayload, statusPayload] = await Promise.all([
      get(`/api/events/${event.id}`),
      get(`/api/events/${event.id}/registration-status`).catch(() => null),
    ]);
    const details = unwrapData(eventPayload, "event") || unwrapData(eventPayload);
    const nextEvent = toUiEvent(details);
    setCurrentEvent(nextEvent);
    setCurrentVenue(details.venue || currentVenue);
    setRegisteredCount(nextEvent.registeredCount);
    setWaitlistCount(nextEvent.waitlistCount);
    setCheckedInCount(nextEvent.checkedInCount);

    const registration = unwrapData(statusPayload, "registration") || unwrapData(statusPayload);
    const status = registration?.status;
    if (status === "CONFIRMED") setRegistrationState("registered");
    else if (status === "CHECKED_IN") setRegistrationState("checked-in");
    else if (status === "WAITLISTED") setRegistrationState("waitlisted");
    else setRegistrationState("none");
    setWaitlistPosition(registration?.waitlistEntry?.position ?? registration?.position ?? null);
  }

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    refresh()
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to sync event details. Showing cached panel data.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [event.id]);

  const remainingSeats = Math.max(currentEvent.capacity - registeredCount, 0);
  const crowdLevel = currentEvent.capacity ? Math.round((registeredCount / currentEvent.capacity) * 100) : 0;
  const canRegister = currentEvent.status !== "closed";

  const localStatus = useMemo(() => {
    if (currentEvent.status === "closed") return "closed";
    if (currentEvent.status === "live") return "live";
    if (remainingSeats === 0) return "waitlist";
    if (registeredCount / currentEvent.capacity >= 0.75) return "filling";
    return "open";
  }, [currentEvent.capacity, currentEvent.status, registeredCount, remainingSeats]);

  async function register() {
    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      const payload = await post(`/api/events/${currentEvent.id}/register`, {});
      const result = unwrapData(payload);
      if (result?.outcome === "WAITLISTED" || result?.registration?.status === "WAITLISTED") {
        setNotice(`Added to waitlist${result?.waitlistEntry?.position ? ` at position ${result.waitlistEntry.position}` : ""}.`);
      } else {
        setNotice("Registration confirmed. Your QR pass is ready.");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelRegistration() {
    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      await post(`/api/events/${currentEvent.id}/cancel`, {});
      setNotice("Registration cancelled.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-6">
        <GlassPanel className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <ControlChip>{currentEvent.category}</ControlChip>
              <h2 className="mt-4 text-4xl font-black uppercase tracking-wide text-white">{currentEvent.title}</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">{currentEvent.description}</p>
            </div>
            <StatusBeacon status={localStatus} />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Start</p><p className="mt-1 font-black text-white">{formatDateTime(currentEvent.startTime)}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">End</p><p className="mt-1 font-black text-white">{formatDateTime(currentEvent.endTime)}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Venue zone</p><p className="mt-1 font-black text-white">{currentVenue ? `${currentVenue.name} / ${("zone" in currentVenue ? currentVenue.zone : currentVenue.room)}` : currentEvent.venue}</p></div>
          </div>
          {isLoading ? <div className="mt-5"><LoadingState label="Syncing event details" /></div> : null}
          {notice ? <div className="mt-5"><SuccessAlert title="Signal accepted">{notice}</SuccessAlert></div> : null}
          {error ? <div className="mt-5"><ErrorAlert title="System warning">{error}</ErrorAlert></div> : null}
        </GlassPanel>

        <div className="grid gap-6 lg:grid-cols-2">
          <CapacityRadar current={registeredCount} capacity={currentEvent.capacity} />
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
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Checked in</p><p className="text-2xl font-black text-white">{checkedInCount}</p></div>
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Waitlist</p><p className="text-2xl font-black text-white">{waitlistCount}</p></div>
          <div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-white/45">Remaining</p><p className="text-2xl font-black text-white">{remainingSeats}</p></div>
        </div>
        {registrationState !== "none" ? (
          <p className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">
            Current status: {registrationState === "checked-in" ? "CHECKED_IN" : registrationState === "registered" ? "CONFIRMED" : `WAITLISTED${waitlistPosition ? ` #${waitlistPosition}` : ""}`}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3">
          <NeonButton type="button" onClick={register} disabled={!canRegister || isSubmitting || registrationState !== "none"}>{isSubmitting ? "Processing..." : remainingSeats > 0 ? "Register" : "Join Waitlist"}</NeonButton>
          <NeonButton type="button" variant="danger" onClick={cancelRegistration} disabled={isSubmitting || registrationState === "none" || registrationState === "checked-in"}>Cancel</NeonButton>
          <NeonButton type="button" onClick={() => router.push(`/pass/${currentEvent.id}`)} variant="ghost" disabled={!["registered", "checked-in"].includes(registrationState)}>View Pass</NeonButton>
        </div>
      </GlassPanel>
    </div>
  );
}
