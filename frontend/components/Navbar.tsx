import Link from "next/link";
import { Button } from "./Button";

const links = [
  { href: "/events", label: "Events" },
  { href: "/organizer/dashboard", label: "Organizer" },
  { href: "/volunteer/scan", label: "Scan" },
  { href: "/admin/analytics", label: "Admin" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-campus text-white">EP</span>
          <span>EventPulse</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-ink/70 hover:text-ink">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button href="/register">Register</Button>
        </div>
      </nav>
    </header>
  );
}

