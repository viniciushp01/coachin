/**
 * Edge Function `enviar-convite`: liga a lógica de enviar.ts ao Supabase e ao SMTP próprio.
 * Exige sessão (verify_jwt = true): o banco confere o convite como quem chama, com o JWT do app.
 * Segredos só do ambiente da função: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e
 * APP_URL (regra 138). Nada deles nem o token vai para o log.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
// @deno-types="npm:@types/nodemailer@6"
import nodemailer from "npm:nodemailer@6";
import { postJson } from "../_shared/http.ts";
import { enviarConvite } from "./enviar.ts";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const APP_URL = Deno.env.get("APP_URL") ?? "";

/** Chaves novas (`SUPABASE_*_KEYS`, JSON por nome) com as antigas como reserva. */
function chave(novas: string, antiga: string): string {
  const json = Deno.env.get(novas);
  if (json) return JSON.parse(json).default;
  return Deno.env.get(antiga)!;
}
const CHAVE_PUBLICA = chave("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");

const porta = Number(Deno.env.get("SMTP_PORT") ?? "587");
const smtp = nodemailer.createTransport({
  host: Deno.env.get("SMTP_HOST"),
  port: porta,
  secure: porta === 465,
  auth: { user: Deno.env.get("SMTP_USER"), pass: Deno.env.get("SMTP_PASS") },
});
// Remetente fixo "Coach In" (regra 136); SMTP_FROM pode vir como "Nome <email>" ou só o e-mail.
const de = Deno.env.get("SMTP_FROM") ?? "";
const REMETENTE = { name: "Coach In", address: de.match(/<([^>]+)>/)?.[1] ?? de.trim() };

const SEM_SESSAO = { persistSession: false, autoRefreshToken: false };

Deno.serve(
  postJson((corpo, req) => {
    const comoQuemChama = createClient(URL_SUPABASE, CHAVE_PUBLICA, {
      auth: SEM_SESSAO,
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    return enviarConvite(
      corpo,
      {
        async reservar(token) {
          const { data, error } = await comoQuemChama.rpc("claim_invite_email", { p_token: token });
          if (error) throw new Error(error.message);
          return data;
        },
        async enviar(m) {
          await smtp.sendMail({
            from: REMETENTE,
            to: m.para,
            subject: m.assunto,
            text: m.texto,
            html: m.html,
          });
        },
      },
      APP_URL,
    );
  }),
);
