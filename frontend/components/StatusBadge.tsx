import type { Status } from "@/lib/data";

const styles: Record<Status, string> = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  filling: "bg-amber-50 text-amber-700 ring-amber-200",
  waitlist: "bg-orange-50 text-orange-700 ring-orange-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
  live: "bg-cyan-50 text-cyan-700 ring-cyan-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${styles[status]}`}>{status}</span>;
}

