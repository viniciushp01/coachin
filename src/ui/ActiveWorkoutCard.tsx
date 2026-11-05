type ActiveWorkoutCardProps = {
  nome: string;
  /** "Semana 4 de 8" (regra 10) ou "Treino concluído" (regra 5). */
  situacao: string;
  /** Preenchimento da barra, de 0 a 1; o treino concluído manda 1. */
  progresso: number;
  /** Treinos feitos neste treino. */
  feitos: number;
  /** Datas já em "dd/mm". */
  inicio: string;
  fim: string;
  /** O título do cartão; "Treino salvo" no treino montado antes do aceite (regra 153). */
  rotulo?: string;
};

/**
 * Cartão do treino ativo (Figma `ActiveWorkoutCard`): nome (trunca em 1 linha, regra 114), semana,
 * treinos feitos, barra de progresso (o único degradê da tela) e datas.
 */
export function ActiveWorkoutCard({
  nome,
  situacao,
  progresso,
  feitos,
  inicio,
  fim,
  rotulo = "Treino ativo",
}: ActiveWorkoutCardProps) {
  const porcento = progresso * 100;
  return (
    <section className="flex w-full flex-col gap-16 rounded-card bg-bg-surface p-20">
      <div className="flex flex-col gap-4">
        <p className="text-overline text-text-secondary">{rotulo}</p>
        <p className="truncate text-title-md text-text-primary">{nome}</p>
      </div>
      <div className="flex items-center justify-between gap-16">
        <p className="text-body-strong text-text-brand-soft">{situacao}</p>
        <p className="flex shrink-0 items-end gap-4">
          <span className="text-number-md text-text-primary">{feitos}</span>
          <span className="text-caption text-text-secondary">
            {feitos === 1 ? "treino feito" : "treinos feitos"}
          </span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso do treino"
        aria-valuenow={Math.round(porcento)}
        className="h-8 overflow-hidden rounded-[4px] bg-bg-surface-raised"
      >
        <div className="h-full rounded-[4px] bg-brand-progress" style={{ width: `${porcento}%` }} />
      </div>
      <div className="flex justify-between text-caption text-text-secondary">
        <p>Início {inicio}</p>
        <p>Fim {fim}</p>
      </div>
    </section>
  );
}
