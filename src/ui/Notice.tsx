import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type NoticeProps = {
  /** info = fundo azul; neutral = cartão (também "Sem conexão"); danger = erro de validação. */
  tom: "info" | "neutral" | "danger";
  titulo: string;
  children?: ReactNode;
  className?: string;
};

export function Notice({ tom, titulo, children, className }: NoticeProps) {
  return (
    <div
      role={tom === "danger" ? "alert" : "status"}
      className={clsx(
        "flex w-full items-start gap-12 rounded-tile p-16",
        tom === "info" && "bg-bg-info-subtle",
        tom === "neutral" && "border border-border-subtle bg-bg-surface",
        tom === "danger" && "border border-border-danger bg-bg-surface",
        className,
      )}
    >
      <span
        className={clsx(
          "shrink-0",
          tom === "info" && "text-status-info",
          tom === "neutral" && "text-text-secondary",
          tom === "danger" && "text-status-danger",
        )}
      >
        <Icon nome={tom === "danger" ? "warning" : "info"} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-body-strong text-text-primary">{titulo}</p>
        {children && <div className="text-body text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}
