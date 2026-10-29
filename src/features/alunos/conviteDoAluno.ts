import type { Database } from "@db/database.types";
import type { TomChip } from "@/ui";

/** As colunas do convite que a visão do professor usa (leitura com a RLS dele). */
export const COLUNAS_DO_CONVITE = "id, status, expires_at, created_at, declined_at";
export type ConviteDoAluno = Pick<
  Database["public"]["Tables"]["invites"]["Row"],
  "id" | "status" | "expires_at" | "created_at" | "declined_at"
>;

/** Aluno que ainda não ativou o acesso, com o convite mais recente dele. */
export type AlunoComConvite = {
  aluno: { id: string; nome: string; email: string | null };
  convite: ConviteDoAluno;
};

export type EstadoDoConvite = "pendente" | "expirado" | "recusado" | "usado" | "substituido";
/** Os estados que o professor vê na tela do aluno e na lista (regras 55 e 102). */
export type EstadoVisivel = "pendente" | "expirado" | "recusado";

/**
 * Estado do convite do aluno na visão do professor (regras 55, 58 e 102). Como no banco
 * (`private.invite_state`), "expirado" é derivado: pendente com a validade vencida.
 */
export function estadoDoConvite(convite: ConviteDoAluno, agora = new Date()): EstadoDoConvite {
  switch (convite.status) {
    case "pending":
      return new Date(convite.expires_at) <= agora ? "expirado" : "pendente";
    case "declined":
      return "recusado";
    case "accepted":
      return "usado";
    case "replaced":
      return "substituido";
  }
}

export function estadoVisivel(estado: EstadoDoConvite): estado is EstadoVisivel {
  return estado === "pendente" || estado === "expirado" || estado === "recusado";
}

/** Chip do estado (regra 55; tons do `design.md`). */
export const CHIP_DO_ESTADO: Record<EstadoVisivel, { tom: TomChip; texto: string }> = {
  pendente: { tom: "info", texto: "Convite pendente" },
  expirado: { tom: "neutral", texto: "Convite expirado" },
  recusado: { tom: "neutral", texto: "Convite recusado" },
};

/** "Recusou o convite em dd/mm" (regra 102); sem a data, só o fato. */
export function textoDaRecusa(convite: ConviteDoAluno): string {
  return convite.declined_at
    ? `Recusou o convite em ${dataCurta(convite.declined_at)}`
    : "Recusou o convite";
}

/** "dd/mm" no fuso do aparelho (ex.: "Convite válido até 03/11"). */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
