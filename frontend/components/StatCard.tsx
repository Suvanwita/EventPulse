export function StatCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-ink/55">{label}</p>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      <p className="mt-2 text-sm text-campus">{delta}</p>
    </div>
  );
}

