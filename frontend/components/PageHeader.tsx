import type { ReactNode } from "react";
import { ControlHeader } from "./OpsUI";

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return <ControlHeader title={title} eyebrow={eyebrow}>{children}</ControlHeader>;
}
