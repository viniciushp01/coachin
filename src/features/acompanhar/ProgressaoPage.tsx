import { useNavigate } from "@tanstack/react-router";
import { primeiroNome } from "@/lib/listas";
import { EmptyState, Icon, Tela } from "@/ui";
import { Cabecalho } from "./Cabecalho";
import type { AlunoAcompanhado, CargaDoExercicio } from "./dados";
import { textoDaUltimaCarga } from "./logica";

/**
 * Progressão de carga, lista (Figma "Progressão · 1 Lista"; regras 44 e 63): só os exercícios com
 * carga registrada, com a última carga. Sem gráficos por enquanto.
 */
export function ProgressaoPage({
  aluno,
  exercicios,
}: {
  aluno: AlunoAcompanhado;
  exercicios: CargaDoExercicio[];
}) {
  const navegar = useNavigate();
  return (
    <Tela logo={false}>
      <Cabecalho
        titulo="Progressão"
        apoio={aluno.nome}
        aoVoltar={() =>
          void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: aluno.id } })
        }
      />
      {exercicios.length === 0 ? (
        <EmptyState icone="trending_up" titulo="Sem cargas registradas">
          Os exercícios aparecem aqui quando {primeiroNome(aluno.nome)} registrar a primeira carga.
        </EmptyState>
      ) : (
        <>
          <p className="text-overline text-text-secondary">Exercícios com carga registrada</p>
          <ul className="flex flex-col gap-8">
            {exercicios.map((e) => (
              <li key={e.exercicioId}>
                <button
                  type="button"
                  onClick={() =>
                    void navegar({
                      to: "/professor/alunos/$alunoId/progressao/$exercicioId",
                      params: { alunoId: aluno.id, exercicioId: e.exercicioId },
                    })
                  }
                  className="flex w-full items-center gap-16 rounded-tile bg-bg-surface p-16 text-left active:bg-bg-surface-raised"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-body-strong break-words text-text-primary">{e.nome}</span>
                    <span className="text-caption text-text-secondary">
                      {textoDaUltimaCarga(e.kg, e.dia)}
                    </span>
                  </span>
                  <span className="shrink-0 text-text-secondary">
                    <Icon nome="chevron_right" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tela>
  );
}
