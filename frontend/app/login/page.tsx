"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/LoadingState";
import { FormInput } from "@/components/FormInput";
import { roleHome, type Role } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [isLoading, setIsLoading] = useState(false);

  function login() {
    setIsLoading(true);
    window.localStorage.setItem("eventpulse-role", role);
    router.push(roleHome[role]);
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to manage passes, queues, and live venue capacity.">
      <form className="grid gap-4">
        <FormInput label="Email" type="email" placeholder="you@campus.edu" />
        <FormInput label="Password" type="password" placeholder="••••••••" />
        <label className="grid gap-2 text-sm font-semibold text-ink/75">
          Demo role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="min-h-11 rounded-md border border-ink/15 bg-white px-3 text-ink outline-none transition focus:border-campus focus:ring-4 focus:ring-campus/10"
          >
            <option value="STUDENT">STUDENT</option>
            <option value="ORGANIZER">ORGANIZER</option>
            <option value="VOLUNTEER">VOLUNTEER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <Button type="button" onClick={login} disabled={isLoading} className="mt-2 w-full">{isLoading ? "Logging in..." : "Log in"}</Button>
        {isLoading ? <LoadingState label="Opening workspace" /> : null}
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        New to EventPulse? <Link className="font-semibold text-campus" href="/register">Create an account</Link>
      </p>
    </AuthCard>
  );
}
