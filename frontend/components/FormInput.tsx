import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FormInput({ label, className = "", ...props }: Props) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white/75">
      {label}
      <input
        className={`min-h-11 rounded-xl border border-cyan-200/14 bg-white/6 px-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10 ${className}`}
        {...props}
      />
    </label>
  );
}
