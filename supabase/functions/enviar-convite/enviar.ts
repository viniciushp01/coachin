/**
 * "Enviar por e-mail" do convite de aluno e de professor (regras 136, 138, 139 e 140).
 * O app manda só o token. O banco (`claim_invite_email`, como quem chama) confere dono, estado
 * e o intervalo de 60 s e devolve o e-mail do convite; qualquer endereço ou URL vindo do app é
 * ignorado. O link é sempre `APP_URL` + /convite/ + token. O token nunca vai para o log.
 *
 * Lógica pura: banco e SMTP entram por `Servicos` (ver index.ts), para testar sem rede.
 */
import { montarEmail, type Tipo } from "./textos.ts";

export type Reserva = { kind: string; email: string; inviter_name: string | null };
export type Mensagem = { para: string; assunto: string; texto: string; html: string };

export type Servicos = {
  /** claim_invite_email; rejeita com o erro do banco (mensagem = código curto). */
  reservar(token: string): Promise<Reserva>;
  enviar(mensagem: Mensagem): Promise<void>;
};

type Resultado = { status: number; corpo: unknown };
const falha = (error: string, status: number): Resultado => ({ status, corpo: { error } });

/** Recusas do banco que seguem para o app (traduzidas em src/lib/erros.ts). */
const STATUS_DO_BANCO: Record<string, number> = {
  invalid_arguments: 400,
  forbidden: 403,
  invite_not_found: 404,
  invite_used: 409,
  invite_replaced: 409,
  invite_expired: 409,
  invite_declined: 409,
  invite_no_email: 409,
  too_many_emails: 429,
};

/** Limite do provedor de e-mail: o mesmo toast do intervalo (regras 130 e 136). */
const LIMITE_DO_SMTP = /rate limit|too many/i;

/**
 * O nome vem de profiles.full_name, que o professor edita: numa linha só e com até 60
 * caracteres, para não virar uma mensagem própria dentro do e-mail com remetente "Coach In".
 */
const nomeCurto = (nome: string | null) =>
  (nome ?? "").replace(/\s+/g, " ").trim().slice(0, 60).trim();

export async function enviarConvite(
  entrada: unknown,
  s: Servicos,
  appUrl: string,
): Promise<Resultado> {
  const token = (entrada as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || token === "") return falha("invalid_arguments", 400);
  const semToken = (erro: unknown) => String(erro).replaceAll(token, "[token]");
  // Configuração antes da reserva: reservar marca o envio e gastaria o intervalo de 60 s.
  if (!appUrl) {
    console.error("APP_URL ausente");
    return falha("erro_desconhecido", 500);
  }

  let reserva: Reserva;
  try {
    reserva = await s.reservar(token);
  } catch (erro) {
    const codigo = erro instanceof Error ? erro.message : "";
    if (Object.hasOwn(STATUS_DO_BANCO, codigo)) return falha(codigo, STATUS_DO_BANCO[codigo]);
    console.error("claim_invite_email falhou", semToken(erro));
    return falha("erro_desconhecido", 500);
  }

  const tipo: Tipo = reserva.kind === "teacher" ? "teacher" : "student";
  const link = `${appUrl.replace(/\/+$/, "")}/convite/${encodeURIComponent(token)}`;
  const email = montarEmail(tipo, nomeCurto(reserva.inviter_name) || "Seu professor", link);

  try {
    await s.enviar({ para: reserva.email, ...email });
  } catch (erro) {
    const motivo = semToken(erro);
    console.error("envio do convite falhou", motivo);
    if (LIMITE_DO_SMTP.test(motivo)) return falha("too_many_emails", 429);
    return falha("email_send_failed", 502);
  }
  return { status: 200, corpo: { ok: true } };
}
