import { createFileRoute } from "@tanstack/react-router";
import { TelaEntrar } from "@/features/acesso/EntrarPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaEntrar = {
  /** E-mail para vir preenchido (ex.: "Entrar com este e-mail", regra 83). */
  email?: string;
};

export const Route = createFileRoute("/entrar")({
  validateSearch: (busca: Record<string, unknown>): BuscaEntrar =>
    typeof busca.email === "string" ? { email: busca.email } : {},
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/entrar"),
  component: TelaEntrar,
});
