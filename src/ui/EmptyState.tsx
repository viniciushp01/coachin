import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon, type NomeIcone } from "./Icon";

type EmptyStateProps = {
  icone: NomeIcone;
  titulo: string;
  children?: ReactNode;
  className?: string;
};

/** Estado vazio centralizado: lista vazia, sem conexão, convite expirado, conta bloqueada… */
export function EmptyState({ icone, titulo, children, className }: EmptyStateProps) {
  return (
    <div className={clsx("flex w-full flex-col items-center gap-16 text-center", className)}>
      <div className="flex size-[88px] items-center justify-center rounded-pill bg-bg-surface text-text-primary">
        <Icon nome={icone} tamanho={40} />
      </div>
      <h2 className="text-title-sm text-text-primary">{titulo}</h2>
      {children && <div className="max-w-[260px] text-body text-text-secondary">{children}</div>}
    </div>
  );
}
