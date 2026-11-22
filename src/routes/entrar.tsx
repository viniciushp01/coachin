import { createFileRoute, redirect } from "@tanstack/react-router";
import { conviteDaBusca, guardarConviteDaBusca } from "@/features/convite/conviteNaUrl";
import { TelaEntrar } from "@/features/acesso/EntrarPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaEntrar = {
  /** E-mail para vir preenchido (ex.: "Entrar com este e-mail", regra 83). */
  email?: string;
  /** Voltou do link de confirmação válido: toast "E-mail confirmado." (regra 128). */
  confirmado?: boolean;
  /** Convite que veio no link de confirmação, guardado de novo aqui (regra 172). */
  convite?: string;
};

export const Route = createFileRoute("/entrar")({
  validateSearch: (busca: Record<string, unknown>): BuscaEntrar => ({
    ...(typeof busca.email === "string" ? { email: busca.email } : {}),
    ...(busca.confirmado === true || busca.confirmado === "true" ? { confirmado: true } : {}),
    ...(conviteDaBusca(busca) ? { convite: conviteDaBusca(busca) } : {}),
  }),
  beforeLoad: async ({ context, search }) => {
    // O token guardado de novo sai do endereço (regra 172): nunca fica visível nem no histórico.
    if (search.convite) {
      guardarConviteDaBusca(search);
      throw redirect({
        to: "/entrar",
        search: {
          ...(search.email ? { email: search.email } : {}),
          ...(search.confirmado ? { confirmado: true } : {}),
        },
        replace: true,
      });
    }
    return exigirDestino(context.queryClient, "/entrar");
  },
  component: TelaEntrar,
});
