import type { Status } from "@/lib/data";
import { StatusBeacon } from "./OpsUI";

export function StatusBadge({ status }: { status: Status }) {
  return <StatusBeacon status={status} />;
}
