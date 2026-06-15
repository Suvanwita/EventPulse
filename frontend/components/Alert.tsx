import type { ReactNode } from "react";

const styles = {
  success: "border-lime/30 bg-lime/10 text-lime shadow-[0_0_24px_rgba(163,230,53,0.12)]",
  error: "border-rose-300/30 bg-rose-400/10 text-rose-100 shadow-[0_0_24px_rgba(251,113,133,0.12)]",
};

export function Alert({ title, children, type }: { title: string; children: ReactNode; type: "success" | "error" }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles[type]}`} role={type === "error" ? "alert" : "status"}>
      <p className="font-bold">{title}</p>
      <div className="mt-1 text-sm leading-6">{children}</div>
    </div>
  );
}

export function SuccessAlert({ title, children }: { title: string; children: ReactNode }) {
  return <Alert title={title} type="success">{children}</Alert>;
}

export function ErrorAlert({ title, children }: { title: string; children: ReactNode }) {
  return <Alert title={title} type="error">{children}</Alert>;
}
