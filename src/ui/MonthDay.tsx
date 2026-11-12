import clsx from "clsx";
import type { EstadoDoDia } from "./WeekDay";

/**
 * Dia do calendário mensal (Figma: Componentes › MonthDay, `state=default|today|future`,
 * `selected=false|true`; 45×68, padding vertical 8). Número e, no dia feito, a bolinha verde de 24
 * com a(s) letra(s) da ficha. Dia futuro mostra só o número, neutro e sem toque.
 */
export function MonthDay({
  estado,
  numero,
  marcas,
  rotulo,
  selecionado = false,
  aoEscolher,
}: {
  estado: EstadoDoDia;
  numero: number;
  /** Letras das fichas feitas no dia ("C", "AB"); vazio se não houve treino. */
  marcas: string;
  /** Nome acessível: a data por extenso. */
  rotulo: string;
  selecionado?: boolean;
  aoEscolher?: () => void;
}) {
  const feito = marcas !== "";
  const futuro = estado === "futuro";
  return (
    <button
      type="button"
      disabled={futuro}
      aria-label={`${rotulo}${feito ? `, ficha ${marcas}` : ""}`}
      aria-pressed={selecionado}
      aria-current={estado === "hoje" ? "date" : undefined}
      onClick={aoEscolher}
      className={clsx(
        "mx-auto flex h-[68px] w-[45px] flex-col items-center gap-8 rounded-control border-2 py-8",
        estado === "hoje" && "bg-bg-surface-raised",
        selecionado ? "border-text-primary" : "border-transparent",
      )}
    >
      <span
        className={clsx(
          "text-body-strong",
          estado === "hoje" && "text-text-brand",
          futuro && "text-text-secondary opacity-55",
          estado === "padrao" && "text-text-primary",
        )}
      >
        {numero}
      </span>
      <span className="flex h-24 items-center justify-center">
        {feito && (
          <span
            data-marca="feita"
            className="font-bold flex h-24 min-w-24 items-center justify-center rounded-pill bg-status-success px-4 text-caption text-bg-canvas"
          >
            {marcas}
          </span>
        )}
      </span>
    </button>
  );
}
