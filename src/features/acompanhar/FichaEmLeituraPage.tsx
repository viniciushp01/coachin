import { useRouter } from "@tanstack/react-router";
import { textoDaCarga, textoDaSerie } from "@/features/aluno/logica";
import { diaEMes } from "@/features/alunos/listaDeAlunos";
import { BackButton, Tela } from "@/ui";
import type { FichaEmLeitura } from "./dados";
import { detalheDaFicha, situacaoDoTreino } from "./logica";

/**
 * Ficha do aluno em modo leitura (Figma "Calendário · 4 Ficha (só leitura)"; regra 69): séries,
 * repetições, descanso, observação e a carga do aluno, sem editar nem marcar.
 */
export function FichaEmLeituraPage({
  ficha,
  feitaEm,
}: {
  ficha: FichaEmLeitura;
  /** Dia em que o aluno fez a ficha, "aaaa-mm-dd"; vem do painel do dia. */
  feitaEm?: string;
}) {
  const router = useRouter();
  const voltar = () => router.history.back();
  const { aluno, treino } = ficha;

  if (ficha.removida) {
    return (
      <Tela logo={false}>
        <BackButton onClick={voltar} />
        <p className="text-body text-text-secondary">Esta ficha foi removida do treino.</p>
      </Tela>
    );
  }

  return (
    <Tela logo={false}>
      <BackButton onClick={voltar} />
      <header className="flex flex-col gap-8">
        <p className="text-overline text-text-secondary">
          {feitaEm ? `Feita em ${diaEMes(feitaEm)}` : "Ficha"}
        </p>
        <h1 className="text-title-screen">Ficha {ficha.letra}</h1>
        <p className="text-body text-text-secondary">
          {detalheDaFicha(ficha.nome, ficha.exercicios.length)}
        </p>
        <p className="truncate text-caption text-text-secondary">
          {situacaoDoTreino(treino.nome, treino.inicio, treino.fim, feitaEm ?? aluno.hoje)}
        </p>
        <p className="text-caption text-text-secondary">{aluno.nome} · só leitura</p>
      </header>

      <ol className="flex flex-col gap-12">
        {ficha.exercicios.map((e, i) => (
          <li
            key={`${e.exercicioId}-${i}`}
            className="flex flex-col gap-12 rounded-card bg-bg-surface p-20"
          >
            <div className="flex items-start gap-12">
              <span className="text-number-md text-text-secondary">{i + 1}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <p className="text-title-sm break-words text-text-primary">{e.nome}</p>
                <p className="text-body text-text-secondary">
                  {textoDaSerie(e.series, e.reps, e.medida)}
                  {e.descanso > 0 && ` · Descanso ${e.descanso} s`}
                </p>
              </div>
            </div>
            {e.observacao && (
              <div className="flex flex-col gap-4">
                <p className="text-overline text-text-secondary">Observação</p>
                <p className="text-body text-text-primary">{e.observacao}</p>
              </div>
            )}
            {e.modoDeCarga !== "none" && (
              <div className="flex flex-col gap-4">
                <p className="text-overline text-text-secondary">Carga</p>
                <p className="flex items-end gap-4">
                  <span className="text-number-md text-text-primary">
                    {e.carga ? textoDaCarga(e.carga.kg) : "—"}
                  </span>
                  {e.carga && <span className="text-caption text-text-secondary">kg</span>}
                </p>
                {e.carga && (
                  <p className="text-caption text-text-secondary">
                    Atualizada em {diaEMes(e.carga.dia)}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </Tela>
  );
}
