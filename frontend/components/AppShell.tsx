import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children, sidebar = false }: { children: ReactNode; sidebar?: boolean }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,229,255,0.08),transparent_34rem)]" />
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {sidebar ? (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <Sidebar />
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export const OpsShell = AppShell;
