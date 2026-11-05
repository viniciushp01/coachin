import { createFileRoute, redirect } from "@tanstack/react-router";
import { FichaPage } from "@/features/aluno/FichaPage";
import { lerTreinoDoAluno } from "@/features/aluno/dados";
import { exigirDestino } from "@/lib/sessao";

// Ficha do aluno (regras 19 a 29). Sempre a versão atual do treino (regra 112).
export const Route = createFileRoute("/aluno_/ficha/$diaId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: async () => {
    const { treino } = await lerTreinoDoAluno();
    if (!treino) throw redirect({ to: "/aluno", replace: true });
    return treino;
  },
  staleTime: 0,
  component: function Ficha() {
    const { diaId } = Route.useParams();
    return <FichaPage treino={Route.useLoaderData()} fichaId={diaId} />;
  },
});
