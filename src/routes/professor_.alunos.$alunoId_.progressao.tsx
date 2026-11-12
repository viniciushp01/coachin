import { createFileRoute, redirect } from "@tanstack/react-router";
import { lerProgressao } from "@/features/acompanhar/dados";
import { ProgressaoPage } from "@/features/acompanhar/ProgressaoPage";
import { exigirDestino } from "@/lib/sessao";

// Progressão de carga, lista (regras 44 e 63) (fatia 7a, só leitura). Aluno sem acesso ativo (convite, arquivado ou de outro professor)
// volta à tela dele.
export const Route = createFileRoute("/professor_/alunos/$alunoId_/progressao")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const dados = await lerProgressao(params.alunoId);
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
    return <ProgressaoPage aluno={dados.aluno} exercicios={dados.exercicios} />;
  },
});
