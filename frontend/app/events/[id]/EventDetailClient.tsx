"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { CapacityBar } from "@/components/CapacityBar";
import { StatusBadge } from "@/components/StatusBadge";
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
        <div className="h-64" style={{ background: event.image }} />
        <div className="grid gap-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-campus">{event.category}</p>
              <h2 className="mt-1 text-2xl font-bold">{event.title}</h2>
            </div>
            <StatusBadge status={localStatus} />
          </div>
          <p className="text-lg leading-8 text-ink/70">{event.description}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-mist p-4">
              <p className="text-sm text-ink/55">Starts</p>
              <p className="font-bold">{formatDateTime(event.startTime)}</p>
            </div>
            <div className="rounded-md bg-mist p-4">
              <p className="text-sm text-ink/55">Ends</p>
              <p className="font-bold">{formatDateTime(event.endTime)}</p>
            </div>
          </div>
          <div className="rounded-md bg-mist p-4">
            <p className="text-sm text-ink/55">Venue info</p>
            <p className="mt-1 font-bold">{venue ? `${venue.name}, ${venue.building}, ${venue.room}` : event.venue}</p>
            <p className="mt-2 text-sm text-ink/60">Venue capacity: {venue?.capacity ?? event.capacity}</p>
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold">Registration</h2>
        <div className="mt-5"><CapacityBar current={registeredCount} capacity={event.capacity} /></div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-mist p-4">
            <p className="text-sm text-ink/55">Registered</p>
            <p className="text-2xl font-bold">{registeredCount}</p>
          </div>
          <div className="rounded-md bg-mist p-4">
            <p className="text-sm text-ink/55">Checked in</p>
            <p className="text-2xl font-bold">{event.checkedInCount}</p>
          </div>
          <div className="rounded-md bg-mist p-4">
            <p className="text-sm text-ink/55">Waitlist</p>
            <p className="text-2xl font-bold">{waitlistCount}</p>
          </div>
          <div className="rounded-md bg-mist p-4">
            <p className="text-sm text-ink/55">Remaining</p>
            <p className="text-2xl font-bold">{remainingSeats}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          <Button type="button" onClick={register} disabled={!canRegister || registrationState === "registered"}>
            Register
          </Button>
          <Button type="button" variant="ghost" onClick={joinWaitlist} disabled={registrationState === "waitlisted"}>
            Join Waitlist
          </Button>
          <Button type="button" variant="ghost" onClick={cancelRegistration} disabled={registrationState === "none"}>
            Cancel Registration
          </Button>
          <Button href={`/pass/${event.id}`} variant="secondary">
            View Pass
          </Button>
        </div>
      </aside>
    </div>
  );
}
