import clsx from "clsx";
import type { ReactNode } from "react";

export type TomChip = "brand" | "info" | "success" | "neutral" | "warning";

const tons: Record<TomChip, string> = {
  brand: "bg-bg-brand-subtle text-text-brand-soft",
  info: "bg-bg-info-subtle text-status-info",
  success: "bg-bg-success-subtle text-status-success",
  neutral: "bg-bg-neutral-subtle text-text-secondary",
  warning: "bg-bg-warning-subtle text-status-warning",
};

/** Rótulo em caixa alta (não é botão). */
export function Chip({ tom, children }: { tom: TomChip; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex h-24 shrink-0 items-center rounded-pill px-12 py-4 text-overline whitespace-nowrap",
        tons[tom],
      )}
    >
      {children}
    </span>
  );
}
