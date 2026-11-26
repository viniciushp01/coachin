import { createFileRoute } from "@tanstack/react-router";
import { lerPerfilDoAluno } from "@/features/aluno/dadosAbas";
import { PerfilAlunoPage } from "@/features/aluno/PerfilAlunoPage";
import { exigirDestino } from "@/lib/sessao";

// Perfil do aluno: dados, professor, conta (sair e excluir) e sobre (regras 85, 108, 120 e 121).
export const Route = createFileRoute("/aluno_/perfil")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: () => lerPerfilDoAluno(),
  staleTime: 0,
  component: function Perfil() {
    return <PerfilAlunoPage dados={Route.useLoaderData()} />;
  },
});
