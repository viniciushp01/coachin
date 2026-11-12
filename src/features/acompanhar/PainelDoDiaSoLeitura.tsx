import { dataPorExtenso } from "@/features/aluno/logica";
import { Button, Sheet } from "@/ui";
import { detalheDaFicha, type FichaMarcada, type MarcacaoDoDia } from "./logica";

/**
 * Painel do dia do professor (Figma "Calendário · 2 Painel do dia (só leitura)"; regras 61 e 69):
 * as fichas que o aluno fez naquele dia, só com "Abrir ficha". Não marca nem desfaz. A ficha
 * removida mantém o nome e perde o "Abrir ficha" (regra 7).
 */
export function PainelDoDiaSoLeitura({
  dia,
  marcacoes,
  fichas,
  aoFechar,
  aoAbrirFicha,
}: {
  /** O dia aberto, "aaaa-mm-dd"; nulo = fechado. */
  dia: string | null;
  marcacoes: MarcacaoDoDia[];
  fichas: FichaMarcada[];
  aoFechar: () => void;
  aoAbrirFicha: (diaId: string, dia: string) => void;
}) {
  const feitas = marcacoes.filter((m) => m.feitoEm === dia);
  return (
    <Sheet aberta={dia !== null} aoFechar={aoFechar} titulo={dia ? dataPorExtenso(dia) : ""}>
      {dia && (
        <div className="flex flex-col gap-16">
          {feitas.length === 0 && <p>Sem registro neste dia.</p>}
          {feitas.map((m) => {
            const ficha = fichas.find((f) => f.id === m.diaId);
            return (
              <div
                key={m.diaId}
                className="flex flex-col gap-12 rounded-tile bg-bg-surface-raised p-16"
              >
                <p className="text-overline text-status-success">✓ Ficha {ficha?.letra} feita</p>
                <div className="flex items-center gap-12">
                  <span
                    aria-hidden="true"
                    className="font-bold flex size-[40px] shrink-0 items-center justify-center rounded-pill bg-status-success text-body-strong text-bg-canvas"
                  >
                    {ficha?.letra}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="truncate text-body-strong text-text-primary">
                      Ficha {ficha?.letra}
                    </p>
                    {ficha && (
                      <p className="truncate text-caption text-text-secondary">
                        {detalheDaFicha(ficha.nome, ficha.exercicios)}
                      </p>
                    )}
                  </div>
                </div>
                {ficha && !ficha.removida && (
                  <Button variante="secondary" onClick={() => aoAbrirFicha(ficha.id, dia)}>
                    Abrir ficha
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
