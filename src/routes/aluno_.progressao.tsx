import { createFileRoute } from "@tanstack/react-router";
import { lerProgressaoDoAluno } from "@/features/aluno/dadosAbas";
import { ProgressaoAlunoPage } from "@/features/aluno/ProgressaoAlunoPage";
import { exigirDestino } from "@/lib/sessao";

// Progressão do aluno, lista (regras 44 e 123).
export const Route = createFileRoute("/aluno_/progressao")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: () => lerProgressaoDoAluno(),
  staleTime: 0,
  component: function Progressao() {
    return <ProgressaoAlunoPage exercicios={Route.useLoaderData()} />;
  },
});
