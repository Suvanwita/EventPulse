import { analytics } from "@/data/analytics";
import { events as eventRecords } from "@/data/events";
import { registrations } from "@/data/registrations";
import { venues as venueRecords } from "@/data/venues";

export type Status = "open" | "filling" | "waitlist" | "closed" | "live";

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  waitlistCount: number;
  status: Status;
  category: string;
  image?: string;
};

export type VenueRecord = {
  id: string;
  name: string;
  building: string;
  room: string;
  location: string;
  capacity: number;
  rows: number;
  seatsPerRow: number;
  occupancy: number;
  status: Status;
};

export const events = eventRecords as EventRecord[];
export const venues = venueRecords as VenueRecord[];
export const stats = analytics.stats;
export const crowdPattern = analytics.crowdPattern;
export const scans = registrations.map(({ attendee, pass, event, status }) => ({ attendee, pass, event, status }));
