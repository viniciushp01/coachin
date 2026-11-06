import { createFileRoute } from "@tanstack/react-router";
import { lerAlunos } from "@/features/alunos/listaDeAlunos";
import { ListaDeAlunosPage } from "@/features/alunos/ListaDeAlunosPage";
import { limparRascunhos } from "@/features/treino/rascunhoGuardado";
import { contaAtual } from "@/lib/conta";
import { exigirDestino } from "@/lib/sessao";

// Lista de alunos: a tela raiz do professor (regras 54, 59 e 147). `staleTime: 0` relê a lista
// ao voltar da tela do aluno com convite.
export const Route = createFileRoute("/professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: async () => {
    const [linhas, professorId] = await Promise.all([lerAlunos(), contaAtual()]);
    // Rascunho vencido ou de quem deixou de ser aluno deste professor não fica no aparelho (regra 162).
    if (professorId) limparRascunhos(professorId, (id) => linhas.some((l) => l.id === id));
    return linhas;
  },
  staleTime: 0,
  component: function Lista() {
    return <ListaDeAlunosPage linhas={Route.useLoaderData()} />;
  },
});
