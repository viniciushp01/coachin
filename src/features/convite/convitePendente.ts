import { rpc } from "@/lib/rpc";

/** Convite de aluno pendente para o e-mail da conta logada (regra 173). */
export type ConvitePendente = { id: string; professor: string };

/**
 * O convite pendente mais recente para o e-mail da conta, ou `null`. Professor bloqueado
 * (`teacher_unavailable`, regra 133) e falha de leitura (ex.: sem conexão) também são `null`: a
 * tela "Você ainda não tem um professor" não depende desta consulta.
 */
export async function lerConvitePendente(): Promise<ConvitePendente | null> {
  let resposta: unknown;
  try {
    resposta = await rpc("my_pending_student_invite");
  } catch {
    return null;
  }
  if (typeof resposta !== "object" || resposta === null) return null;
  const r = resposta as Record<string, unknown>;
  if (r.state !== "valid" || typeof r.invite_id !== "string") return null;
  return { id: r.invite_id, professor: typeof r.inviter_name === "string" ? r.inviter_name : "" };
}
