import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/15 bg-white p-8 text-center">
      <p className="text-lg font-bold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">{children}</div> : null}
    </div>
  );
}

