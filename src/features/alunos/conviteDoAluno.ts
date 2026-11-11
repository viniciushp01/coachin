import type { Database } from "@db/database.types";
import type { TomChip } from "@/ui";
import type { AcaoDoRodape, TreinoDoCartao } from "./alunoVinculado";

/** As colunas do convite que a visão do professor usa (leitura com a RLS dele). */
export const COLUNAS_DO_CONVITE = "id, status, expires_at, created_at, declined_at, email_sent_at";
export type ConviteDoAluno = Pick<
  Database["public"]["Tables"]["invites"]["Row"],
  "id" | "status" | "expires_at" | "created_at" | "declined_at" | "email_sent_at"
>;

/**
 * Aluno que ainda não ativou o acesso, com o convite mais recente dele. Sem convite (nulo): o
 * professor cadastrou e ainda não enviou (regra 164).
 */
export type AlunoComConvite = {
  aluno: { id: string; nome: string; email: string | null };
  convite: ConviteDoAluno | null;
  /** O treino que o professor já montou antes do aceite (regras 122 e 153). */
  treino?: TreinoDoAlunoComConvite;
};

export type EstadoDoConvite = "pendente" | "expirado" | "recusado" | "usado" | "substituido";
/** Os estados que o professor vê na tela do aluno e na lista (regras 55 e 102). */
export type EstadoVisivel = "pendente" | "expirado" | "recusado";

/**
 * Estado do convite do aluno na visão do professor (regras 55, 58 e 102). Como no banco
 * (`private.invite_state`), "expirado" é derivado: pendente com a validade vencida.
 */
export function estadoDoConvite(
  convite: Pick<ConviteDoAluno, "status" | "expires_at">,
  agora = new Date(),
): EstadoDoConvite {
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

/** Quem ainda não tem acesso: um estado do convite ou "sem convite" (regra 164). */
export type SemAcesso = EstadoVisivel | "sem_convite";

/** Chip do aluno cadastrado e ainda não convidado (regra 164): neutro. */
export const CHIP_SEM_CONVITE: { tom: TomChip; texto: string } = {
  tom: "neutral",
  texto: "Sem convite",
};

/** "Recusou o convite em dd/mm" (regra 102); sem a data, só o fato. */
export function textoDaRecusa(convite: Pick<ConviteDoAluno, "declined_at">): string {
  return convite.declined_at
    ? `Recusou o convite em ${dataCurta(convite.declined_at)}`
    : "Recusou o convite";
}

/** "dd/mm" no fuso do aparelho (ex.: "Convite válido até 03/11"). */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export type TreinoDoAlunoComConvite = {
  cartao: TreinoDoCartao | null;
  agendado: boolean;
  acoes: AcaoDoRodape[];
};

/** O estado do convite que a Lista informa (`list_status`); nulo para quem já ativou o acesso. */
export function conviteDaLista(statusDaLista: string | null | undefined): SemAcesso | null {
  switch (statusDaLista) {
    case "sem_convite":
      return "sem_convite";
    case "convite_pendente":
      return "pendente";
    case "convite_expirado":
      return "expirado";
    case "convite_recusado":
      return "recusado";
    default:
      return null;
  }
}
