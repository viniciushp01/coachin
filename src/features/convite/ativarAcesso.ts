import { erroDeAuth } from "@/lib/erros";
import { chamarFuncao } from "@/lib/funcoes";
import { supabase } from "@/lib/supabase";

/**
 * "Ativar acesso" do professor sem conta (regra 93): a Edge Function `ativar-professor` cria a
 * conta já confirmada, com o e-mail do convite, e aceita o convite; depois o app entra com
 * e-mail e senha. Falha: lança `ErroApp`.
 */
export async function ativarAcessoDeProfessor(token: string, email: string, senha: string) {
  await chamarFuncao("ativar-professor", { token, senha });
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw erroDeAuth(error);
}
