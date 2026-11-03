import { ErroApp, erroDeAuth } from "@/lib/erros";
import { chamarFuncao } from "@/lib/funcoes";
import { supabase } from "@/lib/supabase";

/**
 * "Ativar acesso" do professor sem conta (regra 93): a Edge Function `ativar-professor` cria a
 * conta já confirmada, com o e-mail do convite, e aceita o convite; depois o app entra com
 * e-mail e senha. Falha: lança `ErroApp`.
 *
 * Se a resposta de uma tentativa anterior se perdeu (ou o login falhou depois), a nova tentativa
 * acha o convite já usado: aí, se a mesma senha entra, a ativação já tinha dado certo.
 */
export async function ativarAcessoDeProfessor(token: string, email: string, senha: string) {
  let emailDaConta = email;
  try {
    const resposta = await chamarFuncao<{ email?: string }>("ativar-professor", { token, senha });
    if (resposta?.email) emailDaConta = resposta.email;
  } catch (erro) {
    if (!(erro instanceof ErroApp && erro.codigo === "invite_used")) throw erro;
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw erro;
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDaConta,
    password: senha,
  });
  if (error) throw erroDeAuth(error);
}
