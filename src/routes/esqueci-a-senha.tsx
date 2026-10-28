import { createFileRoute } from "@tanstack/react-router";
import { TelaEsqueciSenha } from "@/features/acesso/EsqueciSenhaPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaEsqueci = {
  /** E-mail para vir preenchido (Login, ou o atalho do e-mail em uso, regra 83). */
  email?: string;
};

// Tela pública: quem já está logado vai para a sua área.
export const Route = createFileRoute("/esqueci-a-senha")({
  validateSearch: (busca: Record<string, unknown>): BuscaEsqueci =>
    typeof busca.email === "string" ? { email: busca.email } : {},
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/entrar"),
  component: TelaEsqueciSenha,
});
