import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const styles = {
  primary: "border-cyan-300/40 bg-cyan-300/14 text-cyan-100 shadow-glow hover:bg-cyan-300/22",
  secondary: "border-violet/40 bg-violet/14 text-violet-100 shadow-violet hover:bg-violet/22",
  ghost: "border-white/12 bg-white/5 text-ink hover:border-cyan-300/35 hover:bg-cyan-300/10",
  danger: "border-rose-300/35 bg-rose-400/12 text-rose-100 hover:bg-rose-400/20",
};

export function NeonButton({ href, children, variant = "primary", className = "", ...props }: Props) {
  const classes = `inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-bold tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

