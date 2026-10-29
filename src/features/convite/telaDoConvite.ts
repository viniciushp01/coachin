import type { EstadoSessao } from "@/lib/destino";

/** O que `get_invite_preview` diz do convite, já com nomes do app. */
export type PreviaDoConvite =
  | { estado: "invalido" }
  | {
      estado: "valido" | "expirado" | "usado" | "substituido" | "recusado";
      tipo: "aluno" | "professor";
      /** Nome de quem convidou (professor, ou administrador no convite de professor). */
      professor: string;
      /** E-mail do cadastro; no convite de aluno é opcional (regra 46). */
      email: string | null;
      /** O e-mail do cadastro já tem conta; nulo quando o convite não tem e-mail. */
      temConta: boolean | null;
    };

const ESTADOS = {
  valid: "valido",
  expired: "expirado",
  used: "usado",
  replaced: "substituido",
  declined: "recusado",
} as const;

/** Lê a resposta crua (`Json`) de `get_invite_preview`. Qualquer coisa estranha é link inválido. */
export function lerPrevia(resposta: unknown): PreviaDoConvite {
  if (typeof resposta !== "object" || resposta === null) return { estado: "invalido" };
  const r = resposta as Record<string, unknown>;
  const estado = ESTADOS[r.state as keyof typeof ESTADOS];
  if (!estado || (r.kind !== "student" && r.kind !== "teacher")) return { estado: "invalido" };
  return {
    estado,
    tipo: r.kind === "student" ? "aluno" : "professor",
    professor: typeof r.inviter_name === "string" ? r.inviter_name : "",
    email: typeof r.email === "string" ? r.email : null,
    temConta: typeof r.account_exists === "boolean" ? r.account_exists : null,
  };
}

export type TelaDoConvite =
  | { tela: "valido"; professor: string; email: string | null }
  | { tela: "ja_tem_conta"; professor: string; email: string | null }
  | { tela: "vincular"; professor: string }
  | { tela: "expirado"; professor: string }
  | { tela: "usado" }
  | { tela: "nao_vale_mais" }
  | { tela: "professor" };

/**
 * Qual tela o link do convite abre, cruzando o convite com a sessão deste aparelho.
 * - Válido e deslogado: "Criar meu acesso" ou, se o e-mail já tem conta, "Você já tem uma conta"
 *   (regras 48 e 79). Logado: vai direto para vincular (regra 97).
 * - Expirado e recusado mostram "Este convite expirou" (regras 48 e 132); já usado, "Este convite
 *   já foi usado" (48); substituído ou desconhecido, "Este link não vale mais" (82).
 * - Convite de professor tem a sua própria entrada (regras 93 e 97).
 */
export function telaDoConvite(previa: PreviaDoConvite, sessao: EstadoSessao): TelaDoConvite {
  if (previa.estado === "invalido") return { tela: "nao_vale_mais" };
  if (previa.tipo === "professor") return { tela: "professor" };
  const { professor } = previa;
  switch (previa.estado) {
    case "expirado":
    case "recusado":
      return { tela: "expirado", professor };
    case "usado":
      return { tela: "usado" };
    case "substituido":
      return { tela: "nao_vale_mais" };
    case "valido":
      if (sessao.tipo === "logado") return { tela: "vincular", professor };
      return previa.temConta
        ? { tela: "ja_tem_conta", professor, email: previa.email }
        : { tela: "valido", professor, email: previa.email };
  }
}
