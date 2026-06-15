import type { ReactNode } from "react";

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

export function Alert({ title, children, type }: { title: string; children: ReactNode; type: "success" | "error" }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${styles[type]}`} role={type === "error" ? "alert" : "status"}>
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

