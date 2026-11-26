import { useNavigate } from "@tanstack/react-router";
import type { CargaDoExercicio } from "@/features/acompanhar/dados";
import { textoDaUltimaCarga } from "@/features/acompanhar/logica";
import { EmptyState, Icon, Tela } from "@/ui";
import { MenuDoAluno } from "./MenuDoAluno";

/**
 * Progressão, lista (Figma "Progressão · 1 Lista" e "3 Vazio"; regras 44 e 123): só os exercícios
 * com carga registrada, do que mudou há mais pouco para o mais antigo.
 */
export function ProgressaoAlunoPage({ exercicios }: { exercicios: CargaDoExercicio[] }) {
  const navegar = useNavigate();
  return (
    <Tela menu>
      <h1 className="text-title-screen">Progressão</h1>
      {exercicios.length === 0 ? (
        <EmptyState icone="trending_up" titulo="Nenhum exercício ainda">
          Seus exercícios aparecem aqui quando você registrar a primeira carga.
        </EmptyState>
      ) : (
        <>
          <p className="text-overline text-text-secondary">Exercícios que você já fez</p>
          <ul className="flex flex-col gap-8">
            {exercicios.map((e) => (
              <li key={e.exercicioId}>
                <button
                  type="button"
                  onClick={() =>
                    void navegar({
                      to: "/aluno/progressao/$exercicioId",
                      params: { exercicioId: e.exercicioId },
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
      <MenuDoAluno ativa="progressao" />
    </Tela>
  );
}
