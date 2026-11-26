import { createFileRoute, redirect } from "@tanstack/react-router";
import { lerEvolucaoDoExercicio } from "@/features/aluno/dadosAbas";
import { ExercicioAlunoPage } from "@/features/aluno/ExercicioAlunoPage";
import { exigirDestino } from "@/lib/sessao";

// Progressão do aluno, detalhe do exercício com gráfico (regras 44, 63 e 175). Sem carga nesse
// exercício, volta à lista.
export const Route = createFileRoute("/aluno_/progressao_/$exercicioId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: async ({ params }) => {
    const dados = await lerEvolucaoDoExercicio(params.exercicioId);
    if (!dados) throw redirect({ to: "/aluno/progressao", replace: true });
    return dados;
  },
  staleTime: 0,
  component: function Exercicio() {
    return <ExercicioAlunoPage dados={Route.useLoaderData()} />;
  },
});
