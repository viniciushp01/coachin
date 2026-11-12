import { createFileRoute, redirect } from "@tanstack/react-router";
import { FichaEmLeituraPage } from "@/features/acompanhar/FichaEmLeituraPage";
import { lerFichaEmLeitura } from "@/features/acompanhar/dados";
import { exigirDestino } from "@/lib/sessao";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Ficha do aluno em modo leitura (regra 69; fatia 7a). `em` é o dia da marcação, vindo do painel do
// dia; sem ele a tela abre sem o "Feita em". Sempre a versão atual da ficha (regra 112).
export const Route = createFileRoute("/professor_/alunos/$alunoId_/ficha/$diaId")({
  validateSearch: (busca: Record<string, unknown>): { em?: string } =>
    typeof busca.em === "string" && DATA.test(busca.em) ? { em: busca.em } : {},
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const ficha = await lerFichaEmLeitura(params.alunoId, params.diaId);
    if (!ficha) {
      throw redirect({
        to: "/professor/alunos/$alunoId",
        params: { alunoId: params.alunoId },
        replace: true,
      });
    }
    return ficha;
  },
  staleTime: 0,
  component: function FichaEmLeitura() {
    const { em } = Route.useSearch();
    return <FichaEmLeituraPage ficha={Route.useLoaderData()} feitaEm={em} />;
  },
});
