import { createFileRoute, redirect } from "@tanstack/react-router";
import { lerPerfil } from "@/features/acompanhar/dados";
import { PerfilPage } from "@/features/acompanhar/PerfilPage";
import { exigirDestino } from "@/lib/sessao";

// Perfil do aluno (regras 41, 71 e 108) (fatia 7a, só leitura). Aluno sem acesso ativo (convite, arquivado ou de outro professor)
// volta à tela dele.
export const Route = createFileRoute("/professor_/alunos/$alunoId_/perfil")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const dados = await lerPerfil(params.alunoId);
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
    return <PerfilPage perfil={dados} />;
  },
});
