import { createFileRoute } from "@tanstack/react-router";
import { InicioPage } from "@/features/aluno/InicioPage";
import { lerTreinoDoAluno } from "@/features/aluno/dados";
import { exigirDestino } from "@/lib/sessao";

// Início do aluno (regras 1, 9, 10 e 14 a 18). `staleTime: 0` relê o treino ao voltar da ficha.
export const Route = createFileRoute("/aluno")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: () => lerTreinoDoAluno(),
  staleTime: 0,
  component: function Inicio() {
    const { estado } = Route.useRouteContext();
    return (
      <InicioPage
        nome={estado.tipo === "logado" ? estado.nome : ""}
        dados={Route.useLoaderData()}
      />
    );
  },
});
