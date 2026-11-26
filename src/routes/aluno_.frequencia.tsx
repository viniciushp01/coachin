import { createFileRoute } from "@tanstack/react-router";
import { lerFrequenciaDoAluno } from "@/features/aluno/dadosAbas";
import { FrequenciaPage } from "@/features/aluno/FrequenciaPage";
import { exigirDestino } from "@/lib/sessao";

// Frequência do aluno (regras 9, 45 e 163). `staleTime: 0` relê ao voltar de outra tela.
export const Route = createFileRoute("/aluno_/frequencia")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  loader: () => lerFrequenciaDoAluno(),
  staleTime: 0,
  component: function Frequencia() {
    return <FrequenciaPage dados={Route.useLoaderData()} />;
  },
});
