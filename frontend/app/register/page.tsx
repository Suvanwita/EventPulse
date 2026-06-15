"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormInput } from "@/components/FormInput";
import { LoadingState } from "@/components/LoadingState";
import { NeonButton } from "@/components/NeonButton";
import { ControlChip, GlassPanel, MetricOrb, StatusBeacon } from "@/components/OpsUI";
import { roleHome, type Role } from "@/lib/roles";

const roles: Exclude<Role, "ADMIN">[] = ["STUDENT", "ORGANIZER", "VOLUNTEER"];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Exclude<Role, "ADMIN">>("STUDENT");
  const [isLoading, setIsLoading] = useState(false);

  function register() {
    setIsLoading(true);
    window.localStorage.setItem("eventpulse-role", role);
    router.push(roleHome[role]);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[520px_1fr]">
      <section className="grid place-items-center px-4 py-10">
        <GlassPanel className="w-full max-w-md">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/60">New identity</p>
              <h1 className="mt-3 text-3xl font-black uppercase text-white">Register</h1>
            </div>
            <StatusBeacon status="open" label={role} />
          </div>
          <form className="grid gap-4">
            <FormInput label="Name" placeholder="Jordan Lee" />
            <FormInput label="Email" type="email" placeholder="jordan@campus.edu" />
            <FormInput label="Password" type="password" placeholder="Create a password" />
            <label className="grid gap-2 text-sm font-bold text-white/75">
              Role
              <select value={role} onChange={(event) => setRole(event.target.value as Exclude<Role, "ADMIN">)} className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10">
                {roles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <NeonButton type="button" onClick={register} disabled={isLoading} className="mt-2 w-full">{isLoading ? "Creating..." : "Register"}</NeonButton>
            {isLoading ? <LoadingState label="Preparing role lane" /> : null}
          </form>
          <p className="mt-5 text-center text-sm text-white/55">
            Already connected? <Link className="font-bold text-cyan-100" href="/login">Login</Link>
          </p>
        </GlassPanel>
      </section>
      <section className="hidden min-h-screen items-center px-10 lg:grid">
        <div className="max-w-2xl">
          <ControlChip tone="violet">Role Identity</ControlChip>
          <h1 className="mt-6 text-6xl font-black uppercase leading-none tracking-wide text-white">Provision your campus operations role.</h1>
          <p className="mt-6 text-lg leading-8 text-white/58">Student passes, organizer control, and volunteer gate access all stay frontend-only for now.</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {roles.map((item, index) => <MetricOrb key={item} label={item} value={item.slice(0, 2)} tone={index === 1 ? "violet" : index === 2 ? "lime" : "cyan"} />)}
          </div>
        </div>
      </section>
    </main>
  );
}

