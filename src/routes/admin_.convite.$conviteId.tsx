import { createFileRoute, redirect } from "@tanstack/react-router";
import { lerProfessorComConvite } from "@/features/professores/professorComConvite";
import { ProfessorComConvitePage } from "@/features/professores/ProfessorComConvitePage";
import { exigirDestino } from "@/lib/sessao";

// Convite de professor pendente, expirado ou recusado (regras 92, 93 e 102): só para o
// administrador. Convite usado, substituído ou inexistente volta à lista.
export const Route = createFileRoute("/admin_/convite/$conviteId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/admin"),
  loader: async ({ params }) => {
    const dados = await lerProfessorComConvite(params.conviteId);
    if (!dados) throw redirect({ to: "/admin", replace: true });
    return dados;
  },
  staleTime: 0,
  component: function TelaDoConvite() {
    return <ProfessorComConvitePage {...Route.useLoaderData()} />;
  },
});
