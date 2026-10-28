import { createFileRoute } from "@tanstack/react-router";
import { EntrarPage } from "@/features/acesso/EntrarPage";
import { exigirDestino } from "@/lib/sessao";

export const Route = createFileRoute("/entrar")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/entrar"),
  component: EntrarPage,
});
