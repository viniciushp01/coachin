import { useNavigate } from "@tanstack/react-router";
import { ButtonCompact, Sheet, TextButton } from "@/ui";
import type { TreinoDoAluno } from "./dados";
import { dataPorExtenso, podeMarcar } from "./logica";

type PainelDoDiaProps = {
  treino: TreinoDoAluno;
  /** O dia aberto, "aaaa-mm-dd"; nulo = fechado. */
  dia: string | null;
  ocupado: boolean;
  aoFechar: () => void;
  aoMarcar: (diaId: string, dia: string) => void;
  aoDesfazer: (diaId: string, dia: string) => void;
};

/**
 * Painel do dia (Figma "Painel do dia · 1 a 3"): as fichas feitas naquele dia, com "Abrir ficha" e
 * "Desfazer", e as que ainda dá para marcar (regras 20 a 24). Vale do início do treino até hoje.
 */
export function PainelDoDia({
  treino,
  dia,
  ocupado,
  aoFechar,
  aoMarcar,
  aoDesfazer,
}: PainelDoDiaProps) {
  const navegar = useNavigate();
  const feitas = treino.marcacoes.filter((m) => m.feitoEm === dia);
  const marcavel = dia !== null && podeMarcar(treino.inicio, dia, treino.hoje);
  const paraMarcar = treino.fichas.filter(
    (f) => !f.removida && !feitas.some((m) => m.diaId === f.id),
  );
  const ficha = (id: string) => treino.fichas.find((f) => f.id === id);

  return (
    <Sheet aberta={dia !== null} aoFechar={aoFechar} titulo={dia ? dataPorExtenso(dia) : ""}>
      {dia && (
        <div className="flex flex-col gap-16">
          {feitas.length === 0 && <p>Sem registro neste dia.</p>}
          {feitas.map((m) => {
            const f = ficha(m.diaId);
            return (
              <div
                key={m.diaId}
                className="flex flex-col gap-8 rounded-tile bg-bg-surface-raised p-16"
              >
                <p className="text-body-strong text-text-primary">✓ Ficha {f?.letra} feita</p>
                <p className="truncate text-caption">{f?.nome}</p>
                <div className="flex gap-16">
                  {f && !f.removida && (
                    <TextButton
                      onClick={() => {
                        aoFechar();
                        void navegar({ to: "/aluno/ficha/$diaId", params: { diaId: f.id } });
                      }}
                    >
                      Abrir ficha
                    </TextButton>
                  )}
                  {marcavel && (
                    <TextButton
                      tom="muted"
                      disabled={ocupado}
                      onClick={() => aoDesfazer(m.diaId, dia)}
                    >
                      Desfazer
                    </TextButton>
                  )}
                </div>
              </div>
            );
          })}
          {marcavel && paraMarcar.length > 0 && (
            <div className="flex flex-col gap-8">
              <p className="text-overline">Marcar ficha feita</p>
              {paraMarcar.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-16 rounded-tile bg-bg-surface-raised p-16"
                >
                  <span className="min-w-0 flex-1 truncate text-body-strong text-text-primary">
                    Ficha {f.letra} · {f.nome}
                  </span>
                  <ButtonCompact
                    tamanho="sm"
                    disabled={ocupado}
                    onClick={() => aoMarcar(f.id, dia)}
                    aria-label={`Marcar ficha ${f.letra}`}
                  >
                    Marcar
                  </ButtonCompact>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
