import { createFileRoute } from "@tanstack/react-router";
import { ConvidarProfessorPage } from "@/features/professores/ConvidarProfessorPage";
import { exigirDestino } from "@/lib/sessao";

// Convidar professor e "Convite gerado" (regras 87 e 92): só para o administrador.
export const Route = createFileRoute("/admin_/convidar-professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/admin"),
  component: ConvidarProfessorPage,
});
