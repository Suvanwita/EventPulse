import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FormInput({ label, className = "", ...props }: Props) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/75">
      {label}
      <input
        className={`min-h-11 rounded-md border border-ink/15 bg-white px-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-campus focus:ring-4 focus:ring-campus/10 ${className}`}
        {...props}
      />
    </label>
  );
}

