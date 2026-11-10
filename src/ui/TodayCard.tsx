import type { ReactNode } from "react";
import { Button } from "./Button";
import { Chip } from "./Chip";

type Titulo = { letra: string; nome: string };

function Titulo({ letra, nome }: Titulo) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-title-md text-text-primary">Ficha {letra}</p>
      <p className="line-clamp-2 text-body text-text-secondary">{nome}</p>
    </div>
  );
}

/**
 * "Ficha de hoje" (Figma: Componentes › TodayCard): borda laranja, chip, ficha, prévia dos
 * exercícios e o único botão principal da tela (regras 14 a 17).
 */
export function TodayCard({
  letra,
  nome,
  previa,
  sequencia,
  aoAbrir,
}: Titulo & {
  /** "Supino · Crucifixo + 3 exercícios". */
  previa: ReactNode;
  /** "Segue a sequência depois da Ficha B"; omitido sem ficha feita antes. */
  sequencia?: string;
  aoAbrir: () => void;
}) {
  return (
    <section className="flex flex-col gap-16 rounded-card border-2 border-border-brand bg-bg-surface p-[18px]">
      <div>
        <Chip tom="brand">FICHA DE HOJE</Chip>
      </div>
      <Titulo letra={letra} nome={nome} />
      <div className="flex flex-col gap-4">
        <p className="line-clamp-3 text-body text-text-primary">{previa}</p>
        {sequencia && <p className="text-caption text-text-secondary">{sequencia}</p>}
      </div>
      <Button onClick={aoAbrir}>Ver ficha</Button>
    </section>
  );
}

/**
 * Depois de treinar no dia (Figma: Componentes › TodayCardFeito, regra 163): sem borda laranja e
 * sem botão principal; o "Próximo treino" é só informação (o toque abre a ficha).
 */
export function TodayCardFeito({
  letra,
  nome,
  pendente = false,
  proxima,
  aoAbrirProxima,
}: {
  letra: string;
  nome?: string;
  /** Marcação ainda na fila de envio (regra 116). */
  pendente?: boolean;
  proxima?: Titulo;
  aoAbrirProxima: () => void;
}) {
  return (
    <section
      aria-label="Treino de hoje feito"
      className="flex flex-col gap-16 rounded-card bg-bg-surface p-20"
    >
      <div>
        {pendente ? (
          <Chip tom="neutral">AGUARDANDO ENVIO</Chip>
        ) : (
          <Chip tom="success">✓ FEITA HOJE</Chip>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-title-md text-text-primary">Ficha {letra}</p>
        {nome && <p className="line-clamp-2 text-body text-text-secondary">{nome}</p>}
      </div>
      {proxima && (
        <button
          type="button"
          onClick={aoAbrirProxima}
          aria-label={`Próximo treino: Ficha ${proxima.letra}, ${proxima.nome}`}
          className="flex flex-col gap-4 text-left"
        >
          <span className="text-caption text-text-secondary">Próximo treino</span>
          <span className="line-clamp-2 text-body text-text-primary">
            Ficha {proxima.letra} · {proxima.nome}
          </span>
        </button>
      )}
    </section>
  );
}
