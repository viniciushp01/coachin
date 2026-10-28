import { createFileRoute } from "@tanstack/react-router";
import { TelaEntrar } from "@/features/acesso/EntrarPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaEntrar = {
  /** E-mail para vir preenchido (ex.: "Entrar com este e-mail", regra 83). */
  email?: string;
  /** Voltou do link de confirmação válido: toast "E-mail confirmado." (regra 128). */
  confirmado?: boolean;
};

export const Route = createFileRoute("/entrar")({
  validateSearch: (busca: Record<string, unknown>): BuscaEntrar => ({
    ...(typeof busca.email === "string" ? { email: busca.email } : {}),
    ...(busca.confirmado === true || busca.confirmado === "true" ? { confirmado: true } : {}),
  }),
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/entrar"),
  component: TelaEntrar,
});
