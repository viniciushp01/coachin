import { lerConviteGuardado } from "@/features/convite/conviteGuardado";
import { erroDeAuth } from "@/lib/erros";
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

type VoltaComToken = VoltaDoLink & { tokenHash?: string };

export type DecisaoDaVolta = ResultadoDaConfirmacao | { tipo: "confirmar"; tokenHash: string };

/**
 * O que fazer ao abrir `/confirmar-email` (regras 128 e 176). Link novo, com `token_hash`: só
 * mostra "Confirmar e-mail", sem falar com o Supabase, para que abrir o link (de novo, em outro
 * navegador ou por um verificador de links do e-mail) não o gaste. Link antigo, já verificado
 * pelo Supabase antes de voltar ao app: segue `resolverLinkDeConfirmacao`, para os e-mails já
 * enviados continuarem valendo.
 */
export async function decidirVoltaDoLink({
  tokenHash,
  ...volta
}: VoltaComToken): Promise<DecisaoDaVolta> {
  if (tokenHash) return { tipo: "confirmar", tokenHash };
  return resolverLinkDeConfirmacao(volta);
}

type ToqueEmConfirmar = { tokenHash: string; pedidoEm?: number; agora: number };

/**
 * O toque em "Confirmar e-mail" (regra 176): só aqui o token é gasto. Válido: encerra neste
 * aparelho a sessão que a confirmação abre e leva ao Login com "E-mail confirmado." (regra 128).
 * Recusado pelo Supabase (vencido, já usado ou substituído): a tela do link, separada pela hora
 * do pedido. Sem conexão ou limite de requisições, o token não chegou a ser gasto: o erro sobe
 * para o toast e o botão continua.
 */
export async function confirmarEmailPeloToque({
  tokenHash,
  pedidoEm,
  agora,
}: ToqueEmConfirmar): Promise<ResultadoDaConfirmacao> {
  const { data, error } = await supabase.auth.verifyOtp({ type: "signup", token_hash: tokenHash });
  if (error) {
    const erro = erroDeAuth(error);
    if (erro.codigo === "sem_conexao" || erro.codigo === "too_many_requests") throw erro;
    const situacao = situacaoDoLink({ hash: "#error", pedidoEm, agora, temSessao: false });
    return { tipo: "tela", situacao: situacao === "expirado" ? "expirado" : "nao_vale_mais" };
  }
  const email = data.user?.email ?? "";
  await supabase.auth.signOut({ scope: "local" });
  return { tipo: "confirmado", email };
}
