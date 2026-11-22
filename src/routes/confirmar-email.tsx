import { createFileRoute, redirect } from "@tanstack/react-router";
import { TelaLinkConfirmacao } from "@/features/acesso/LinkConfirmacaoPage";
import { resolverLinkDeConfirmacao } from "@/features/acesso/linkDeConfirmacao";
import { conviteDaBusca } from "@/features/convite/conviteNaUrl";

type BuscaConfirmar = {
  /** Hora em que o link foi pedido (posta pelo app no endereço de volta). */
  pedido?: number;
  /** Convite que o aluno abriu antes de criar a conta (regra 172); segue para o Login. */
  convite?: string;
};

// Volta do link de confirmação do e-mail (regra 128). Sem guarda de papel: o link abre uma
// sessão, que esta rota encerra antes de levar ao Login.
export const Route = createFileRoute("/confirmar-email")({
  validateSearch: (busca: Record<string, unknown>): BuscaConfirmar => {
    const pedido = Number(busca.pedido);
    const convite = conviteDaBusca(busca);
    return {
      ...(Number.isFinite(pedido) && pedido > 0 ? { pedido } : {}),
      ...(convite ? { convite } : {}),
    };
  },
  beforeLoad: async ({ search }) => {
    const resultado = await resolverLinkDeConfirmacao({
      hash: window.location.hash,
      pedidoEm: search.pedido,
      agora: Date.now(),
    });
    if (resultado.tipo === "confirmado") {
      throw redirect({
        to: "/entrar",
        search: {
          ...(resultado.email ? { email: resultado.email } : {}),
          confirmado: true,
          ...(search.convite ? { convite: search.convite } : {}),
        },
        replace: true,
      });
    }
    return { situacao: resultado.situacao };
  },
  component: TelaLinkConfirmacao,
});
