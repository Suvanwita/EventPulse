import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const styles = {
  primary: "bg-campus text-white hover:bg-[#17685d]",
  secondary: "bg-ink text-white hover:bg-[#223238]",
  ghost: "bg-white text-ink ring-1 ring-ink/10 hover:bg-mist",
};

export function Button({ href, children, variant = "primary", className = "", ...props }: Props) {
  const classes = `inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`;

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
