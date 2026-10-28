const UM_DIA = 24 * 60 * 60 * 1000;

/** O que fazer com um link de e-mail que voltou ao app. */
export type SituacaoDoLink = "valido" | "expirado" | "nao_vale_mais";

type RetornoDoLink = {
  /** `location.hash` na volta: o Supabase põe `#error=…` quando o link não vale. */
  hash: string;
  /** Hora em que o link foi pedido, que o app pôs no endereço de volta (`?pedido=`). */
  pedidoEm?: number;
  agora: number;
  /** O Supabase abriu a sessão do link (recuperação de senha). */
  temSessao: boolean;
};

/**
 * Decide a tela da volta do link (regras 88 e 100). O Supabase responde `otp_expired` tanto
 * para link vencido quanto para link já usado ou substituído; a hora do pedido separa os dois:
 * com mais de 1 dia é "Este link expirou", senão "Este link não vale mais".
 */
export function situacaoDoLink({
  hash,
  pedidoEm,
  agora,
  temSessao,
}: RetornoDoLink): SituacaoDoLink {
  const erro = new URLSearchParams(hash.replace(/^#/, "")).has("error");
  if (erro)
    return pedidoEm !== undefined && agora - pedidoEm > UM_DIA ? "expirado" : "nao_vale_mais";
  return temSessao ? "valido" : "nao_vale_mais";
}
