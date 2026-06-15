import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" subtitle="Join EventPulse as an attendee, organizer, volunteer, or admin.">
      <form className="grid gap-4">
        <FormInput label="Full name" placeholder="Jordan Lee" />
        <FormInput label="Campus email" type="email" placeholder="jordan@campus.edu" />
        <FormInput label="Password" type="password" placeholder="Create a password" />
        <Button type="button" className="mt-2 w-full">Register</Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        Already registered? <Link className="font-semibold text-campus" href="/login">Log in</Link>
      </p>
    </AuthCard>
  );
}

