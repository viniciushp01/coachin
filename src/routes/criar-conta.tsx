import { createFileRoute } from "@tanstack/react-router";
import { CriarContaPage } from "@/features/acesso/CriarContaPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaCriarConta = {
  /** E-mail do cadastro feito pelo professor, preenchido e editável (regra 46). */
  email?: string;
};

// Tela pública: quem já está logado vai para a sua área.
export const Route = createFileRoute("/criar-conta")({
  validateSearch: (busca: Record<string, unknown>): BuscaCriarConta =>
    typeof busca.email === "string" ? { email: busca.email } : {},
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/entrar"),
  component: function TelaCriarConta() {
    const { email } = Route.useSearch();
    return <CriarContaPage emailInicial={email} />;
  },
});
