/**
 * Edge Function `ativar-professor`: liga a lógica de ativar.ts ao Supabase.
 * Pública (verify_jwt = false): quem chama ainda não tem conta; o que autoriza é o token do
 * convite. A chave secreta só existe aqui, lida do ambiente da função (nunca no app).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { postJson } from "../_shared/http.ts";
import { ativarProfessor } from "./ativar.ts";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;

/** Chaves novas (`SUPABASE_*_KEYS`, JSON por nome) com as antigas como reserva. */
function chave(novas: string, antiga: string): string {
  const json = Deno.env.get(novas);
  if (json) return JSON.parse(json).default;
  return Deno.env.get(antiga)!;
}
const CHAVE_SECRETA = chave("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
const CHAVE_PUBLICA = chave("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");

const SEM_SESSAO = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_SUPABASE, CHAVE_SECRETA, SEM_SESSAO);

Deno.serve(
  postJson((corpo) =>
    ativarProfessor(corpo, {
      async lerPrevia(token) {
        const publico = createClient(URL_SUPABASE, CHAVE_PUBLICA, SEM_SESSAO);
        const { data, error } = await publico.rpc("get_invite_preview", { p_token: token });
        if (error) throw error;
        return data;
      },

      async criarUsuario(email, senha) {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
        });
        if (error || !data.user) return { erro: error?.code ?? "sem_usuario" };
        return { id: data.user.id };
      },

      // O aceite roda como a conta nova (accept_teacher_invite usa auth.uid() e confere o
      // e-mail), num cliente só desta chamada; a sessão é encerrada no fim.
      async aceitarConvite(email, senha, token) {
        const conta = createClient(URL_SUPABASE, CHAVE_PUBLICA, SEM_SESSAO);
        const entrada = await conta.auth.signInWithPassword({ email, password: senha });
        if (entrada.error) {
          console.error("signInWithPassword falhou", entrada.error.code);
          return { erro: "" };
        }
        const { error } = await conta.rpc("accept_teacher_invite", { p_token: token });
        await conta.auth.signOut({ scope: "local" }).catch(() => undefined);
        return error ? { erro: error.message } : null;
      },

      async apagarUsuario(id) {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
      },
    }),
  ),
);
