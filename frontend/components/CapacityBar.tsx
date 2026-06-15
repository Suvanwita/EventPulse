export function CapacityBar({ current, capacity }: { current: number; capacity: number }) {
  const percent = Math.min(Math.round((current / capacity) * 100), 100);

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.14em]">
        <span className="text-white/50">{current} signal</span>
        <span className="text-cyan-100">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime shadow-[0_0_18px_rgba(0,229,255,0.45)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
