export function CapacityBar({ current, capacity }: { current: number; capacity: number }) {
  const percent = Math.min(Math.round((current / capacity) * 100), 100);

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-ink/65">{current} checked in</span>
        <span className="font-semibold">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-campus" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

