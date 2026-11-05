import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { CriarTreinoPage, type PassoDoTreino } from "@/features/treino/CriarTreinoPage";
import { lerTreinoParaEditar } from "@/features/treino/treinoParaEditar";
import { exigirDestino } from "@/lib/sessao";

const PASSOS: readonly PassoDoTreino[] = [
  "fichas",
  "ficha",
  "adicionar",
  "novo-exercicio",
  "ajustar-exercicio",
  "ocultos",
];

// Editar o treino ativo (regras 6 e 76), sem o passo Dados: início e semanas não mudam.
export const Route = createFileRoute("/professor_/alunos/$alunoId_/editar-treino")({
  validateSearch: (busca: Record<string, unknown>): { passo?: PassoDoTreino } =>
    PASSOS.includes(busca.passo as PassoDoTreino) ? { passo: busca.passo as PassoDoTreino } : {},
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const leitura = await lerTreinoParaEditar(params.alunoId);
    if (!leitura) {
      throw redirect({
        to: "/professor/alunos/$alunoId",
        params: { alunoId: params.alunoId },
        replace: true,
      });
    }
    return leitura;
  },
  // Relê ao entrar, para abrir a versão atual, mas não a cada passo.
  shouldReload: ({ cause }) => cause !== "stay",
  component: function EditarTreino() {
    const { aluno, treino } = Route.useLoaderData();
    const { passo = "fichas" } = Route.useSearch();
    const navegar = Route.useNavigate();
    const router = useRouter();
    return (
      <CriarTreinoPage
        aluno={aluno}
        treino={treino}
        passo={passo}
        irPara={(proximo) => void navegar({ search: { passo: proximo } })}
        voltar={() => router.history.back({ ignoreBlocker: true })}
      />
    );
  },
});
