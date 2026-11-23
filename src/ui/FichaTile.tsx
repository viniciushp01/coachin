import type { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Card de uma ficha na home do aluno (Figma: "Outras fichas" e "Próximo treino"): letra, "Ficha X",
 * nome · nº de exercícios. Com `seta`, mostra a seta à direita (regra 174). O toque abre a ficha.
 */
export function FichaTile({
  letra,
  detalhe,
  aoAbrir,
  seta = false,
  rotulo,
  fim,
}: {
  letra: string;
  /** Segunda linha: "nome · 5 exercícios". */
  detalhe: string;
  aoAbrir: () => void;
  seta?: boolean;
  /** aria-label, quando o nome acessível precisa dizer mais que o texto visível. */
  rotulo?: string;
  /** Marca à direita (ex.: chip com a data da última vez). */
  fim?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-label={rotulo}
      className="flex items-center gap-16 rounded-tile bg-bg-surface p-16 text-left"
    >
      <span className="flex size-40 shrink-0 items-center justify-center rounded-control bg-bg-surface-raised text-body-strong">
        {letra}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-strong text-text-primary">Ficha {letra}</span>
        <span className="truncate text-caption text-text-secondary">{detalhe}</span>
      </span>
      {fim}
      {seta && (
        <span className="shrink-0 text-text-secondary">
          <Icon nome="chevron_right" />
        </span>
      )}
    </button>
  );
}
