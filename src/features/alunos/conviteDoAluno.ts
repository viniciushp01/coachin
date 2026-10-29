import type { Database } from "@db/database.types";

type Convite = Pick<
  Database["public"]["Tables"]["invites"]["Row"],
  "id" | "status" | "expires_at" | "created_at" | "declined_at"
>;

export type EstadoDoConvite = "pendente" | "expirado" | "recusado" | "usado" | "substituido";

/**
 * Estado do convite do aluno na visão do professor (regras 55, 58 e 102). Como no banco
 * (`private.invite_state`), "expirado" é derivado: pendente com a validade vencida.
 */
export function estadoDoConvite(convite: Convite, agora = new Date()): EstadoDoConvite {
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

/** "dd/mm" no fuso do aparelho (ex.: "Convite válido até 03/11"). */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
