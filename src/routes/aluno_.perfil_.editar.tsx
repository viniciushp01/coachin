import { createFileRoute } from "@tanstack/react-router";
import { lerPerfilDoAluno } from "@/features/aluno/dadosAbas";
import { EditarDadosPage } from "@/features/aluno/EditarDadosPage";
import { exigirDestino } from "@/lib/sessao";

// Editar dados do perfil (regras 85, 99 e 108).
export const Route = createFileRoute("/aluno_/perfil_/editar")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: () => lerPerfilDoAluno(),
  staleTime: 0,
  component: function Editar() {
    return <EditarDadosPage perfil={Route.useLoaderData().perfil} />;
  },
});
