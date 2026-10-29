import clsx from "clsx";

type StepIndicatorProps = {
  passo: number;
  total: number;
  className?: string;
};

/**
 * "PASSO 1 DE 2" + uma barra por passo (ativa em `bg/brand`, as seguintes em `surface-raised`).
 * Primeiro acesso (regra 49). Anunciado como barra de progresso para leitor de tela.
 */
export function StepIndicator({ passo, total, className }: StepIndicatorProps) {
  const rotulo = `Passo ${passo} de ${total}`;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={passo}
      className={clsx("flex w-full flex-col gap-8", className)}
    >
      <span aria-hidden="true" className="text-overline text-text-secondary">
        {rotulo}
      </span>
      <div className="flex gap-8">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            data-barra={i < passo ? "ativa" : "inativa"}
            className={clsx(
              "h-4 flex-1 rounded-pill",
              i < passo ? "bg-bg-brand" : "bg-bg-surface-raised",
            )}
          />
        ))}
      </div>
    </div>
  );
}
