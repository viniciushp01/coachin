import { createFileRoute, redirect } from "@tanstack/react-router";
import { TelaConfirmeEmail } from "@/features/acesso/ConfirmeEmailPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaConfirme = {
  /** E-mail para onde o link de confirmação foi enviado. */
  email: string;
};

// Tela pública: sem e-mail na busca não há o que confirmar, então volta ao Login.
export const Route = createFileRoute("/confirme-seu-email")({
  validateSearch: (busca: Record<string, unknown>): BuscaConfirme => ({
    email: typeof busca.email === "string" ? busca.email : "",
  }),
  beforeLoad: async ({ context, search }) => {
    const resultado = await exigirDestino(context.queryClient, "/entrar");
    if (!search.email) throw redirect({ to: "/entrar", replace: true });
    return resultado;
  },
  component: TelaConfirmeEmail,
});
