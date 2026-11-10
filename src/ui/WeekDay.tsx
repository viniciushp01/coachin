import clsx from "clsx";

export type EstadoDoDia = "padrao" | "hoje" | "futuro";

/**
 * Dia da faixa semanal (Figma: Componentes › WeekDay, `state=default|today|future`).
 * Marca de 24 px: bolinha verde com a(s) letra(s) da ficha feita; anel laranja em "hoje" sem
 * treino; ponto cinza nos dias futuros; nada em dia passado sem registro.
 */
export function WeekDay({
  estado,
  inicial,
  numero,
  marcas,
  rotulo,
  desativado = false,
  aoEscolher,
}: {
  estado: EstadoDoDia;
  /** Inicial do dia da semana (S, T, Q…). */
  inicial: string;
  numero: number;
  /** Letras das fichas feitas no dia ("C", "AB"); vazio se não houve treino. */
  marcas: string;
  /** Nome acessível: a data por extenso. */
  rotulo: string;
  desativado?: boolean;
  aoEscolher?: () => void;
}) {
  const feito = marcas !== "";
  return (
    <button
      type="button"
      disabled={desativado}
      onClick={aoEscolher}
      aria-label={`${rotulo}${feito ? `, ficha ${marcas}` : ""}`}
      className={clsx(
        "flex min-w-0 flex-1 flex-col items-center gap-8 rounded-control py-8",
        estado === "hoje" && "bg-bg-surface-raised",
        desativado && estado !== "futuro" && "opacity-50",
      )}
    >
      <span className="text-caption text-text-secondary">{inicial}</span>
      <span
        className={clsx(
          "text-body-strong",
          estado === "hoje" && "text-text-brand",
          estado === "futuro" && "text-text-secondary opacity-55",
          estado === "padrao" && "text-text-primary",
        )}
      >
        {numero}
      </span>
      <span className="flex h-24 items-center justify-center">
        {feito ? (
          <span
            data-marca="feita"
            className="font-bold flex h-24 min-w-24 items-center justify-center rounded-pill bg-status-success px-4 text-caption text-bg-canvas"
          >
            {marcas}
          </span>
        ) : estado === "hoje" ? (
          <span data-marca="hoje" className="size-24 rounded-pill border-2 border-border-brand" />
        ) : estado === "futuro" ? (
          <span data-marca="futuro" className="size-[6px] rounded-pill bg-border-default" />
        ) : null}
      </span>
    </button>
  );
}
