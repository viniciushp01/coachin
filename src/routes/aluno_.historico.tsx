import { createFileRoute } from "@tanstack/react-router";
import { lerHistoricoDoAluno } from "@/features/aluno/dadosAbas";
import { HistoricoAlunoPage } from "@/features/aluno/HistoricoAlunoPage";
import { exigirDestino } from "@/lib/sessao";

// Histórico do aluno: os treinos anteriores (regra 68).
export const Route = createFileRoute("/aluno_/historico")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: () => lerHistoricoDoAluno(),
  staleTime: 0,
  component: function Historico() {
    return <HistoricoAlunoPage treinos={Route.useLoaderData()} />;
  },
});
