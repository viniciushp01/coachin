import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarioPage } from "@/features/acompanhar/CalendarioPage";
import { lerCalendario } from "@/features/acompanhar/dados";
import { exigirDestino } from "@/lib/sessao";

// Calendário do aluno (regras 61, 69 e 72) (fatia 7a, só leitura). Aluno sem acesso ativo (convite, arquivado ou de outro professor)
// volta à tela dele.
export const Route = createFileRoute("/professor_/alunos/$alunoId_/calendario")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const dados = await lerCalendario(params.alunoId);
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
    return <CalendarioPage dados={dados} />;
  },
});
