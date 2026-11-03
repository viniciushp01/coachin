import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { ErroApp, MENSAGENS, erroDaResposta, type CodigoErro } from "./erros";
import { supabase } from "./supabase";

/**
 * Chama uma Edge Function (supabase/functions). Só para o que o banco não faz sozinho (ex.:
 * criar a conta de quem recebeu o convite de professor); o resto da escrita continua em `rpc()`.
 * Falha: lança `ErroApp`. A função responde `{ error: "codigo" }`, traduzido em erros.ts.
 */
export async function chamarFuncao<T = unknown>(nome: string, corpo: object): Promise<T> {
  let resposta;
  try {
    resposta = await supabase.functions.invoke(nome, { body: corpo });
  } catch (erro) {
    throw erroDaResposta(erro);
  }
  if (!resposta.error) return resposta.data as T;
  throw await erroDaFuncao(resposta.error);
}

async function erroDaFuncao(erro: unknown): Promise<ErroApp> {
  if (erro instanceof FunctionsFetchError) return new ErroApp("sem_conexao", { cause: erro });
  if (erro instanceof FunctionsHttpError) {
    const codigo = await (erro.context as Response).json().then(
      (corpo: { error?: unknown }) => corpo?.error,
      () => undefined,
    );
    if (typeof codigo === "string" && Object.hasOwn(MENSAGENS, codigo)) {
      return new ErroApp(codigo as CodigoErro, { cause: erro });
    }
    return new ErroApp("erro_desconhecido", { cause: erro });
  }
  return erroDaResposta(erro);
}
