import { createFileRoute, redirect } from "@tanstack/react-router";
import { TelaLinkConfirmacao } from "@/features/acesso/ConfirmarEmailPage";
import { decidirVoltaDoLink } from "@/features/acesso/linkDeConfirmacao";
import { conviteDaBusca } from "@/features/convite/conviteNaUrl";

type BuscaConfirmar = {
  /** Hora em que o link foi pedido (posta pelo app no endereço de volta). */
  pedido?: number;
  /** Convite que o aluno abriu antes de criar a conta (regra 172); segue para o Login. */
  convite?: string;
  /** Link novo (regra 176): o modelo do e-mail aponta direto para cá com o token. */
  token_hash?: string;
  type?: string;
};

// Volta do link de confirmação do e-mail (regras 128 e 176). Sem guarda de papel. Link novo
// (com `token_hash`): só confirma ao toque em "Confirmar e-mail". Link antigo: o Supabase já
// confirmou e abriu uma sessão, que esta rota encerra antes de levar ao Login.
export const Route = createFileRoute("/confirmar-email")({
  validateSearch: (busca: Record<string, unknown>): BuscaConfirmar => {
    const pedido = Number(busca.pedido);
    const convite = conviteDaBusca(busca);
    const tokenHash = typeof busca.token_hash === "string" ? busca.token_hash : "";
    return {
      ...(Number.isFinite(pedido) && pedido > 0 ? { pedido } : {}),
      ...(convite ? { convite } : {}),
      ...(tokenHash ? { token_hash: tokenHash } : {}),
      ...(typeof busca.type === "string" ? { type: busca.type } : {}),
    };
  },
  beforeLoad: async ({ search }) => {
    const resultado = await decidirVoltaDoLink({
      tokenHash: search.token_hash,
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
    return resultado.tipo === "confirmar"
      ? { tipo: "confirmar" as const, tokenHash: resultado.tokenHash }
      : { tipo: "tela" as const, situacao: resultado.situacao };
  },
  component: TelaLinkConfirmacao,
});
