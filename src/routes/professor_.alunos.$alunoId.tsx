import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlunoComConvitePage } from "@/features/alunos/AlunoComConvitePage";
import { lerAlunoComConvite } from "@/features/alunos/alunosComConvite";
import { exigirDestino } from "@/lib/sessao";

// Aluno com convite (regras 55, 58 e 102): só para o professor dono (RLS). Aluno que já ativou o
// acesso ou que não é dele volta à área do professor.
export const Route = createFileRoute("/professor_/alunos/$alunoId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const dados = await lerAlunoComConvite(params.alunoId);
    if (!dados) throw redirect({ to: "/professor", replace: true });
    return dados;
  },
  staleTime: 0,
  component: function TelaAlunoComConvite() {
    const dados = Route.useLoaderData();
    return <AlunoComConvitePage {...dados} />;
  },
});
