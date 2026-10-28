import clsx from "clsx";
import type { ComponentProps } from "react";
import { Icon, type NomeIcone } from "./Icon";

type SectionRowProps = Omit<ComponentProps<"button">, "children"> & {
  icone: NomeIcone;
  titulo: string;
  detalhe?: string;
  /** Ícone da direita: chevron_right (padrão), more_horiz, undo… */
  iconeDireita?: NomeIcone;
};

/** Linha de atalho com ícone. Título e detalhe truncam em 1 linha. */
export function SectionRow({
  icone,
  titulo,
  detalhe,
  iconeDireita = "chevron_right",
  type = "button",
  className,
  ...props
}: SectionRowProps) {
  return (
    <button
      type={type}
      className={clsx(
        "flex w-full items-center gap-16 rounded-tile bg-bg-surface p-16 text-left active:bg-bg-surface-raised",
        className,
      )}
      {...props}
    >
      <span className="flex size-[44px] shrink-0 items-center justify-center rounded-inset bg-bg-surface-raised text-text-primary">
        <Icon nome={icone} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate text-body-strong text-text-primary">{titulo}</span>
        {detalhe && <span className="truncate text-caption text-text-secondary">{detalhe}</span>}
      </span>
      <span className="shrink-0 text-text-secondary">
        <Icon nome={iconeDireita} />
      </span>
    </button>
  );
}
