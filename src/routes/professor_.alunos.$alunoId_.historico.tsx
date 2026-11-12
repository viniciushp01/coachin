import { createFileRoute, redirect } from "@tanstack/react-router";
import { lerHistorico } from "@/features/acompanhar/dados";
import { HistoricoPage } from "@/features/acompanhar/HistoricoPage";
import { exigirDestino } from "@/lib/sessao";

// Histórico de treinos (regra 68) (fatia 7a, só leitura). Aluno sem acesso ativo (convite, arquivado ou de outro professor)
// volta à tela dele.
export const Route = createFileRoute("/professor_/alunos/$alunoId_/historico")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const dados = await lerHistorico(params.alunoId);
    if (!dados) {
      throw redirect({
        to: "/professor/alunos/$alunoId",
        params: { alunoId: params.alunoId },
        replace: true,
      });
    }
    return dados;
  },
  staleTime: 0,
  component: function Tela() {
    const dados = Route.useLoaderData();
    return <HistoricoPage aluno={dados.aluno} treinos={dados.treinos} />;
  },
});
