import { createFileRoute, redirect } from "@tanstack/react-router";
import { ExercicioPage } from "@/features/acompanhar/ExercicioPage";
import { lerHistoricoDeCargas } from "@/features/acompanhar/dados";
import { exigirDestino } from "@/lib/sessao";

// Progressão de carga, detalhe do exercício (regra 63; fatia 7a, só leitura). Sem acesso ativo ou
// sem carga nesse exercício, volta à lista.
export const Route = createFileRoute("/professor_/alunos/$alunoId_/progressao_/$exercicioId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const dados = await lerHistoricoDeCargas(params.alunoId, params.exercicioId);
    if (!dados) {
      throw redirect({
        to: "/professor/alunos/$alunoId/progressao",
        params: { alunoId: params.alunoId },
        replace: true,
      });
    }
    return dados;
  },
  staleTime: 0,
  component: function Exercicio() {
    return <ExercicioPage dados={Route.useLoaderData()} />;
  },
});
