import { PulseMetric } from "./OpsUI";

export function StatCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <PulseMetric label={label} value={value} delta={delta} />;
}
