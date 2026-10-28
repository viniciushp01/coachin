import type { Database } from "@db/database.types";
import { ErroApp, erroDaResposta } from "./erros";
import { supabase } from "./supabase";

type Funcoes = Database["public"]["Functions"];
export type NomeFuncao = keyof Funcoes;
type Argumentos<F extends NomeFuncao> = Funcoes[F]["Args"];
export type Retorno<F extends NomeFuncao> = Funcoes[F]["Returns"];

/** Funções sem argumento têm `Args: never` nos tipos gerados: aí a chamada não leva objeto. */
type ParametrosRpc<F extends NomeFuncao> = [Argumentos<F>] extends [never] ? [] : [Argumentos<F>];

/**
 * Chama uma função do banco (toda escrita do app passa por aqui).
 * Sucesso: devolve o retorno tipado. Falha: lança `ErroApp`, com o código curto do banco
 * (ex.: `invite_expired`) e a mensagem em pt-BR pronta para a tela.
 */
export async function rpc<F extends NomeFuncao>(
  funcao: F,
  ...parametros: ParametrosRpc<F>
): Promise<Retorno<F>> {
  let resposta;
  try {
    // O tipo genérico do supabase-js não acompanha a união de funções; os tipos de entrada e
    // saída já estão garantidos pela assinatura acima.
    const cliente = supabase as unknown as {
      rpc: (f: string, a?: object) => PromiseLike<RespostaRpc>;
    };
    resposta = await cliente.rpc(funcao, parametros[0]);
  } catch (erro) {
    throw erroDaResposta(erro);
  }
  if (resposta.error) throw erroDaResposta(resposta.error);
  return resposta.data as Retorno<F>;
}

type RespostaRpc = { data: unknown; error: unknown };

export { ErroApp };
