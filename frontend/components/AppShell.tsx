import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children, sidebar = false }: { children: ReactNode; sidebar?: boolean }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {sidebar ? (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <Sidebar />
            <div>{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}

