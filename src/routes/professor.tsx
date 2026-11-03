import { createFileRoute } from "@tanstack/react-router";
import { lerAlunos } from "@/features/alunos/listaDeAlunos";
import { ListaDeAlunosPage } from "@/features/alunos/ListaDeAlunosPage";
import { exigirDestino } from "@/lib/sessao";

// Lista de alunos: a tela raiz do professor (regras 54, 59 e 147). `staleTime: 0` relê a lista
// ao voltar da tela do aluno com convite.
export const Route = createFileRoute("/professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: () => lerAlunos(),
  staleTime: 0,
  component: function Lista() {
    return <ListaDeAlunosPage linhas={Route.useLoaderData()} />;
  },
});
