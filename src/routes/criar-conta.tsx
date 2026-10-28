import { createFileRoute } from "@tanstack/react-router";
import { CriarContaPage } from "@/features/acesso/CriarContaPage";
import { exigirDestino } from "@/lib/sessao";

// Tela pública: quem já está logado vai para a sua área.
export const Route = createFileRoute("/criar-conta")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/entrar"),
  component: CriarContaPage,
});
