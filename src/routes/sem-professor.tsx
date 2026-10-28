import { createFileRoute } from "@tanstack/react-router";
import { SemProfessorPage } from "@/features/acesso/SemProfessorPage";
import { exigirDestino } from "@/lib/sessao";

export const Route = createFileRoute("/sem-professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/sem-professor"),
  component: SemProfessorPage,
});
