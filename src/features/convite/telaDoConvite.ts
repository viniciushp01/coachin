import type { EstadoSessao } from "@/lib/destino";

/** O que `get_invite_preview` diz do convite, já com nomes do app. */
export type PreviaDoConvite =
  | { estado: "invalido" }
  | {
      estado: "valido" | "expirado" | "usado" | "substituido" | "recusado" | "indisponivel";
      tipo: "aluno" | "professor";
      /** Nome de quem convidou (professor, ou administrador no convite de professor). */
      professor: string;
      /** E-mail do cadastro; no convite de aluno é opcional (regra 46). */
      email: string | null;
      /** O e-mail do cadastro já tem conta; nulo quando o convite não tem e-mail. */
      temConta: boolean | null;
      /** A conta logada já é aluno ativo deste professor (regra 134). */
      jaVinculado: boolean;
    };

const ESTADOS = {
  valid: "valido",
  expired: "expirado",
  used: "usado",
  replaced: "substituido",
  declined: "recusado",
  // Professor bloqueado com o convite ainda válido (regra 133).
  teacher_unavailable: "indisponivel",
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
    jaVinculado: r.already_linked === true,
  };
}

export type TelaDoConvite =
  | { tela: "valido"; professor: string; email: string | null }
  | { tela: "ja_tem_conta"; professor: string; email: string | null }
  | { tela: "vincular"; professor: string; email: string }
  | { tela: "trocar"; professor: string; professorAtual: string }
  | { tela: "expirado"; professor: string }
  | { tela: "usado" }
  | { tela: "nao_vale_mais" }
  | { tela: "professor_ja_tem_conta"; email: string | null }
  | { tela: "ative_seu_acesso"; email: string | null }
  | { tela: "ativar_professor" }
  | { tela: "outra_conta"; email: string }
  | { tela: "professor_nao_vale_mais" }
  | { tela: "indisponivel"; professor: string }
  | { tela: "conta_nao_aluno"; email: string | null }
  | { tela: "ja_vinculado" };

/**
 * Qual tela o link do convite abre, cruzando o convite com a sessão deste aparelho.
 * - Válido e deslogado: "Criar meu acesso" ou, se o e-mail já tem conta, "Você já tem uma conta"
 *   (regras 48 e 79). Logado: vai direto para vincular (regra 97); aluno que já tem professor
 *   vê "Trocar de professor?" com o nome do atual (regra 98).
 * - Expirado e recusado mostram "Este convite expirou" (regras 48 e 132); já usado, "Este convite
 *   já foi usado" (48); substituído ou desconhecido, "Este link não vale mais" (82).
 * - Precedência (regra 137): os estados do convite, depois o professor bloqueado ("Este convite
 *   não está disponível no momento", 133), depois a conta logada: professor ou administrador vê
 *   "Este convite é para outra conta" (134, também quando entrou pelo convite) e aluno já
 *   vinculado a este professor recebe o toast e vai para o início (134).
 * - Convite de professor (regras 93 e 97): fora de validade, "Este link não vale mais" com o texto
 *   do professor; deslogado, "Você já tem uma conta" ou "Ative seu acesso"; logado, "Ativar
 *   acesso de professor?" só na conta do e-mail do convite, senão "Este convite é para outra
 *   conta". O servidor confere o e-mail de novo ao ativar (`email_mismatch`).
 */
export function telaDoConvite(
  previa: PreviaDoConvite,
  sessao: EstadoSessao,
  professorAtual: string | null = null,
): TelaDoConvite {
  if (previa.estado === "invalido") return { tela: "nao_vale_mais" };
  if (previa.tipo === "professor") return telaDoConviteDeProfessor(previa, sessao);
  const { professor } = previa;
  switch (previa.estado) {
    case "expirado":
    case "recusado":
      return { tela: "expirado", professor };
    case "usado":
      return { tela: "usado" };
    case "substituido":
      return { tela: "nao_vale_mais" };
    case "indisponivel":
      return { tela: "indisponivel", professor };
    case "valido":
      if (sessao.tipo === "logado" && sessao.papel !== "aluno") {
        return { tela: "conta_nao_aluno", email: sessao.email };
      }
      if (sessao.tipo === "logado" && previa.jaVinculado) return { tela: "ja_vinculado" };
      if (sessao.tipo === "logado" && sessao.temProfessor) {
        return { tela: "trocar", professor, professorAtual: professorAtual ?? "" };
      }
      if (sessao.tipo === "logado") return { tela: "vincular", professor, email: sessao.email };
      return previa.temConta
        ? { tela: "ja_tem_conta", professor, email: previa.email }
        : { tela: "valido", professor, email: previa.email };
  }
}

function telaDoConviteDeProfessor(
  previa: Exclude<PreviaDoConvite, { estado: "invalido" }>,
  sessao: EstadoSessao,
): TelaDoConvite {
  if (previa.estado !== "valido") return { tela: "professor_nao_vale_mais" };
  if (sessao.tipo === "anonimo") {
    return previa.temConta
      ? { tela: "professor_ja_tem_conta", email: previa.email }
      : { tela: "ative_seu_acesso", email: previa.email };
  }
  return previa.email?.toLowerCase() === sessao.email.toLowerCase()
    ? { tela: "ativar_professor" }
    : { tela: "outra_conta", email: sessao.email };
}

/**
 * Erros de `accept_teacher_invite` e `decline_invite` no convite de professor com tela própria:
 * todo convite que mudou é "Este link não vale mais". `decline_invite` responde só
 * `invite_not_pending`; `already_teacher` é o convite já ativado (ex.: em outra aba), porque o
 * servidor confere o papel antes do convite.
 */
export function telaDoErroDoConviteDeProfessor(codigo: string): TelaDoConvite | null {
  return CONVITE_DE_PROFESSOR_MUDOU.includes(codigo) ? { tela: "professor_nao_vale_mais" } : null;
}

const CONVITE_DE_PROFESSOR_MUDOU = [
  "invite_expired",
  "invite_declined",
  "invite_used",
  "invite_replaced",
  "invite_invalid",
  "invite_not_pending",
  "already_teacher",
];

/**
 * Erros de `accept_student_invite` e `decline_invite` que têm tela própria: o convite mudou
 * enquanto a tela estava aberta (venceu, foi recusado, usado ou substituído), a conta não é de
 * aluno (`role_not_allowed`) ou já é deste professor (`already_linked`, regra 134). Os demais são
 * toast, como `teacher_unavailable` (regra 133).
 */
export function telaDoErroDoConvite(
  codigo: string,
  professor: string,
  email: string | null = null,
): TelaDoConvite | null {
  if (codigo === "role_not_allowed") return { tela: "conta_nao_aluno", email };
  if (codigo === "already_linked") return { tela: "ja_vinculado" };
  if (codigo === "invite_expired" || codigo === "invite_declined") {
    return { tela: "expirado", professor };
  }
  if (codigo === "invite_used") return { tela: "usado" };
  if (codigo === "invite_replaced" || codigo === "invite_invalid") return { tela: "nao_vale_mais" };
  return null;
}
