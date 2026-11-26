import type { TreinoAnterior } from "@/features/acompanhar/dados";
import { fichasDoTreino, periodoDoTreino } from "@/features/acompanhar/logica";
import { EmptyState, Tela } from "@/ui";
import { MenuDoAluno } from "./MenuDoAluno";

/**
 * Histórico do aluno (Figma "Histórico · 1 Lista" e "2 Vazio"; regra 68): os treinos anteriores,
 * do mais novo para o mais antigo, com período, semanas e fichas.
 */
export function HistoricoAlunoPage({ treinos }: { treinos: TreinoAnterior[] }) {
  return (
    <Tela menu>
      <h1 className="text-title-screen">Histórico</h1>
      {treinos.length === 0 ? (
        <EmptyState icone="history" titulo="Nenhum treino anterior">
          Quando um novo treino for ativado, o atual aparece aqui.
        </EmptyState>
      ) : (
        <>
          <p className="text-overline text-text-secondary">Treinos anteriores</p>
          <ul className="flex flex-col gap-8">
            {treinos.map((t) => (
              <li key={t.id} className="flex flex-col gap-4 rounded-tile bg-bg-surface p-16">
                <p className="truncate text-body-strong text-text-primary">{t.nome}</p>
                <p className="text-caption text-text-secondary">
                  {periodoDoTreino(t.inicio, t.fim, t.semanas)}
                </p>
                <p className="text-caption text-text-secondary">{fichasDoTreino(t.letras)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <MenuDoAluno ativa="historico" />
    </Tela>
  );
}
