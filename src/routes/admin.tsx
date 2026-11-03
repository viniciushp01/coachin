import { createFileRoute } from "@tanstack/react-router";
import { lerProfessores } from "@/features/professores/listaDeProfessores";
import { ListaDeProfessoresPage } from "@/features/professores/ListaDeProfessoresPage";
import { exigirDestino } from "@/lib/sessao";

// Lista de professores: a tela raiz do administrador (regras 92 e 102).
export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/admin"),
  loader: () => lerProfessores(),
  staleTime: 0,
  component: function Lista() {
    return <ListaDeProfessoresPage linhas={Route.useLoaderData()} />;
  },
});
