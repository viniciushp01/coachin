import { createFileRoute, redirect } from "@tanstack/react-router";
import { TelaConfiraEmail } from "@/features/acesso/ConfiraEmailPage";
import { exigirDestino } from "@/lib/sessao";

type BuscaConfira = {
  /** E-mail para onde o link de nova senha foi enviado. */
  email: string;
};

// Tela pública: sem e-mail na busca não há o que conferir, então volta ao pedido do link.
export const Route = createFileRoute("/confira-seu-email")({
  validateSearch: (busca: Record<string, unknown>): BuscaConfira => ({
    email: typeof busca.email === "string" ? busca.email : "",
  }),
  beforeLoad: async ({ context, search }) => {
    const resultado = await exigirDestino(context.queryClient, "/entrar");
    if (!search.email) throw redirect({ to: "/esqueci-a-senha", replace: true });
    return resultado;
  },
  component: TelaConfiraEmail,
});
