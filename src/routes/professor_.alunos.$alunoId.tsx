import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlunoComConvitePage } from "@/features/alunos/AlunoComConvitePage";
import { AlunoVinculadoPage } from "@/features/alunos/AlunoVinculadoPage";
import { lerTelaDoAluno } from "@/features/alunos/alunoVinculado";
import { exigirDestino } from "@/lib/sessao";

// Tela do aluno, só para o professor dono (RLS): a do convite (regras 55, 58 e 102) ou a do aluno
// vinculado (regra 68), pelo status do vínculo. Aluno arquivado ou que não é dele volta à lista.
export const Route = createFileRoute("/professor_/alunos/$alunoId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const tela = await lerTelaDoAluno(params.alunoId);
    if (!tela) throw redirect({ to: "/professor", replace: true });
    return tela;
  },
  staleTime: 0,
  component: function TelaDoAluno() {
    const tela = Route.useLoaderData();
    return tela.tela === "convite" ? (
      <AlunoComConvitePage {...tela.dados} />
    ) : (
      <AlunoVinculadoPage aluno={tela.dados} />
    );
  },
});
