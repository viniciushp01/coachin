import { createFileRoute, redirect } from "@tanstack/react-router";
import { FichaPage } from "@/features/aluno/FichaPage";
import { lerTreinoParaExibir } from "@/features/aluno/dados";
import { exigirDestino } from "@/lib/sessao";

// Ficha do aluno (regras 19 a 29). Sempre a versão atual do treino (regra 112).
export const Route = createFileRoute("/aluno_/ficha/$diaId")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: async () => {
    const dados = await lerTreinoParaExibir();
    if (!dados.treino) throw redirect({ to: "/aluno", replace: true });
    return { treino: dados.treino, offline: dados.offline === true };
  },
  staleTime: 0,
  component: function Ficha() {
    const { diaId } = Route.useParams();
    const { treino, offline } = Route.useLoaderData();
    return <FichaPage treino={treino} offline={offline} fichaId={diaId} />;
  },
});
