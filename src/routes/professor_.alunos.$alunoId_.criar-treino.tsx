import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { lerAlunoDoTreino } from "@/features/treino/alunoDoTreino";
import { CriarTreinoPage, type PassoDoTreino } from "@/features/treino/CriarTreinoPage";
import { contaAtual } from "@/lib/conta";
import { exigirDestino } from "@/lib/sessao";

const PASSOS: readonly PassoDoTreino[] = [
  "dados",
  "fichas",
  "ficha",
  "adicionar",
  "novo-exercicio",
  "ajustar-exercicio",
  "ocultos",
];

// Criar treino (regra 73). O passo fica na URL para o "voltar" do aparelho andar um passo em vez de
// sair do fluxo (regra 107). O rascunho fica também no aparelho (regra 162).
export const Route = createFileRoute("/professor_/alunos/$alunoId_/criar-treino")({
  validateSearch: (busca: Record<string, unknown>): { passo?: PassoDoTreino } =>
    PASSOS.includes(busca.passo as PassoDoTreino) ? { passo: busca.passo as PassoDoTreino } : {},
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async ({ params }) => {
    const [aluno, professorId] = await Promise.all([
      lerAlunoDoTreino(params.alunoId),
      contaAtual(),
    ]);
    if (!aluno) {
      throw redirect({
        to: "/professor/alunos/$alunoId",
        params: { alunoId: params.alunoId },
        replace: true,
      });
    }
    return { aluno, professorId };
  },
  // Relê ao entrar (o treino atual pode ter mudado), mas não a cada passo.
  shouldReload: ({ cause }) => cause !== "stay",
  component: function CriarTreino() {
    const { aluno, professorId } = Route.useLoaderData();
    const { passo = "dados" } = Route.useSearch();
    const navegar = Route.useNavigate();
    const router = useRouter();
    return (
      <CriarTreinoPage
        aluno={aluno}
        passo={passo}
        irPara={(proximo) => void navegar({ search: { passo: proximo } })}
        voltar={() => router.history.back({ ignoreBlocker: true })}
        guardarNoAparelho={
          professorId
            ? {
                professorId,
                abrirCaminho: async (passos) => {
                  // Um de cada vez: o histórico junta num só os que chegam no mesmo instante.
                  for (const proximo of passos) await navegar({ search: { passo: proximo } });
                },
              }
            : undefined
        }
      />
    );
  },
});
