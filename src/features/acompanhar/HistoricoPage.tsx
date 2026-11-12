import { useNavigate } from "@tanstack/react-router";
import { EmptyState, Tela } from "@/ui";
import { Cabecalho } from "./Cabecalho";
import type { AlunoAcompanhado, TreinoAnterior } from "./dados";
import { fichasDoTreino, periodoDoTreino } from "./logica";

/**
 * Histórico de treinos do aluno (Figma "Histórico · 1 Lista"; regra 68): os treinos encerrados,
 * do mais novo para o mais antigo, com período, semanas e fichas. Lista simples, sem detalhe.
 */
export function HistoricoPage({
  aluno,
  treinos,
}: {
  aluno: AlunoAcompanhado;
  treinos: TreinoAnterior[];
}) {
  const navegar = useNavigate();
  return (
    <Tela logo={false}>
      <Cabecalho
        titulo="Histórico"
        apoio={aluno.nome}
        aoVoltar={() =>
          void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: aluno.id } })
        }
      />
      {treinos.length === 0 ? (
        <EmptyState icone="history" titulo="Nenhum treino anterior">
          Quando um treino for substituído por outro, ele aparece aqui.
        </EmptyState>
      ) : (
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
      )}
    </Tela>
  );
}
