"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { roleHome, type Role } from "@/lib/roles";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Exclude<Role, "ADMIN">>("STUDENT");

  function register() {
    window.localStorage.setItem("eventpulse-role", role);
    router.push(roleHome[role]);
  }

  return (
    <AuthCard title="Create your account" subtitle="Join EventPulse as a student, organizer, or volunteer.">
      <form className="grid gap-4">
        <FormInput label="Full name" placeholder="Jordan Lee" />
        <FormInput label="Campus email" type="email" placeholder="jordan@campus.edu" />
        <FormInput label="Password" type="password" placeholder="Create a password" />
        <label className="grid gap-2 text-sm font-semibold text-ink/75">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Exclude<Role, "ADMIN">)}
            className="min-h-11 rounded-md border border-ink/15 bg-white px-3 text-ink outline-none transition focus:border-campus focus:ring-4 focus:ring-campus/10"
          >
            <option value="STUDENT">STUDENT</option>
            <option value="ORGANIZER">ORGANIZER</option>
            <option value="VOLUNTEER">VOLUNTEER</option>
          </select>
        </label>
        <Button type="button" onClick={register} className="mt-2 w-full">Register</Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        Already registered? <Link className="font-semibold text-campus" href="/login">Log in</Link>
      </p>
    </AuthCard>
  );
}
