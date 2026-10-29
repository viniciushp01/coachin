import clsx from "clsx";
import { Chip, type TomChip } from "./Chip";
import { Icon } from "./Icon";

type StudentRowProps = {
  nome: string;
  status: { tom: TomChip; texto: string };
  detalhe: string;
  /** Sem ação, a linha não é botão e não mostra a seta. */
  onClick?: () => void;
};

/**
 * Linha de pessoa na lista (Figma `StudentRow`; também a de professores do administrador):
 * nome e detalhe truncam em 1 linha (regra 114), chip de status, seta quando abre a pessoa.
 */
export function StudentRow({ nome, status, detalhe, onClick }: StudentRowProps) {
  const conteudo = (
    <>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-8">
        <span className="w-full truncate text-body-strong text-text-primary">{nome}</span>
        <Chip tom={status.tom}>{status.texto}</Chip>
        <span className="w-full truncate text-caption text-text-secondary">{detalhe}</span>
      </span>
      {onClick && (
        <span className="shrink-0 text-text-secondary">
          <Icon nome="chevron_right" />
        </span>
      )}
    </>
  );
  const classe = clsx(
    "flex w-full items-center gap-16 rounded-tile bg-bg-surface p-16 text-left",
    onClick && "active:bg-bg-surface-raised",
  );
  return onClick ? (
    <button type="button" className={classe} onClick={onClick}>
      {conteudo}
    </button>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
