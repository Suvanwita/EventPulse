import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to manage passes, queues, and live venue capacity.">
      <form className="grid gap-4">
        <FormInput label="Email" type="email" placeholder="you@campus.edu" />
        <FormInput label="Password" type="password" placeholder="••••••••" />
        <Button type="button" className="mt-2 w-full">Log in</Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        New to EventPulse? <Link className="font-semibold text-campus" href="/register">Create an account</Link>
      </p>
    </AuthCard>
  );
}

