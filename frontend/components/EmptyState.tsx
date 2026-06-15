import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-cyan-200/18 bg-panel p-8 text-center backdrop-blur-xl">
      <p className="text-lg font-black text-white">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">{children}</div> : null}
    </div>
  );
}
