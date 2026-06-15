export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm font-bold text-cyan-100/65" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-campus/30 border-t-campus" />
      {label}
    </div>
  );
}
