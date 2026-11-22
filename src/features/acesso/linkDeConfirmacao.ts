import { lerConviteGuardado } from "@/features/convite/conviteGuardado";
import { supabase } from "@/lib/supabase";
import { situacaoDoLink } from "./retornoDoLink";
import { urlDoApp } from "./urlDoApp";

/**
 * Para onde volta o link de confirmação do e-mail (criar conta e "Reenviar link"). A hora do
 * pedido vai no endereço para separar link vencido de link já usado (`situacaoDoLink`). Com
 * convite guardado, o token vai junto (`convite`), para o convite sobreviver à confirmação em
 * outro navegador ou app (regra 172).
 */
export function urlDeVoltaDaConfirmacao(agora = Date.now()) {
  const convite = lerConviteGuardado();
  return urlDoApp(`/confirmar-email?pedido=${agora}${convite ? `&convite=${convite}` : ""}`);
}

type VoltaDoLink = { hash: string; pedidoEm?: number; agora: number };

export type ResultadoDaConfirmacao =
  { tipo: "confirmado"; email: string } | { tipo: "tela"; situacao: "expirado" | "nao_vale_mais" };

/**
 * Volta do link de confirmação (regra 128). Válido: o Supabase já confirmou o e-mail e abriu
 * uma sessão; o app a encerra neste aparelho e leva ao Login com "E-mail confirmado.", sem
 * entrar direto. Vencido ou já usado: a tela própria, com "Ir para o login".
 */
export async function resolverLinkDeConfirmacao({
  hash,
  pedidoEm,
  agora,
}: VoltaDoLink): Promise<ResultadoDaConfirmacao> {
  // `getSession` espera o Supabase ler o link; com erro, o `#error=…` continua no endereço.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const situacao = situacaoDoLink({ hash, pedidoEm, agora, temSessao: session !== null });
  if (situacao !== "valido") return { tipo: "tela", situacao };
  const email = session?.user.email ?? "";
  await supabase.auth.signOut({ scope: "local" });
  return { tipo: "confirmado", email };
}
