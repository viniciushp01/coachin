import clsx from "clsx";
import { Chip, type TomChip } from "./Chip";
import { Icon } from "./Icon";

type StudentRowProps = {
  nome: string;
  status: { tom: TomChip; texto: string };
  /** Segundo chip, ao lado do status (camada `Solicitação` do Figma, ex.: "Pediu treino"). */
  solicitacao?: { tom: TomChip; texto: string };
  /** Sem detalhe, a linha mostra só nome e chip. */
  detalhe?: string;
  /** Sem ação, a linha não é botão e não mostra a seta. */
  onClick?: () => void;
};

/**
 * Linha de pessoa na lista (Figma `StudentRow`; também a de professores do administrador):
 * nome e detalhe truncam em 1 linha (regra 114), chip de status (e o da solicitação, na mesma
 * linha, sem quebrar), seta quando abre a pessoa.
 */
export function StudentRow({ nome, status, solicitacao, detalhe, onClick }: StudentRowProps) {
  const conteudo = (
    <>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-8">
        <span className="w-full truncate text-body-strong text-text-primary">{nome}</span>
        <span className="flex max-w-full flex-nowrap gap-8 overflow-hidden">
          <Chip tom={status.tom}>{status.texto}</Chip>
          {solicitacao && <Chip tom={solicitacao.tom}>{solicitacao.texto}</Chip>}
        </span>
        {detalhe && (
          <span className="w-full truncate text-caption text-text-secondary">{detalhe}</span>
        )}
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
