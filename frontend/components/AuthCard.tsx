import type { ReactNode } from "react";
import { GlassPanel } from "./OpsUI";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <GlassPanel className="w-full max-w-md">
        <div className="mb-6">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 font-black text-cyan-100 shadow-glow">EP</div>
          <h1 className="text-3xl font-black uppercase tracking-wide text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">{subtitle}</p>
        </div>
        {children}
      </GlassPanel>
    </main>
  );
}
