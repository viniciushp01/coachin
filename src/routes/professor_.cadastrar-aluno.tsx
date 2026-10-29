import { createFileRoute } from "@tanstack/react-router";
import { CadastrarAlunoPage } from "@/features/alunos/CadastrarAlunoPage";
import { exigirDestino } from "@/lib/sessao";

// Cadastrar aluno e "Convite gerado" (regras 46, 57 e 109): só para professor.
export const Route = createFileRoute("/professor_/cadastrar-aluno")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  component: CadastrarAlunoPage,
});
