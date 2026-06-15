import { EventRadarCard } from "./OpsUI";
import type { EventRecord } from "@/lib/data";

export function EventCard({ event }: { event: EventRecord }) {
  return <EventRadarCard event={event} />;
}
