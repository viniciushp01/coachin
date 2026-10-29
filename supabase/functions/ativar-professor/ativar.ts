/**
 * "Ative seu acesso" (regras 78, 87 e 93): professor convidado cujo e-mail ainda não tem conta.
 * O banco só converte conta existente, então a função cria a conta já confirmada, com o e-mail
 * do convite (nunca um e-mail vindo do app), e aceita o convite como essa conta. Se o aceite
 * falhar, a conta criada é apagada: ou a pessoa vira professor, ou nada muda.
 *
 * Lógica pura: o acesso ao Supabase entra por `Servicos` (ver index.ts), para testar sem rede.
 */

export type Servicos = {
  /** Resposta crua de `get_invite_preview`. */
  lerPrevia(token: string): Promise<unknown>;
  /** Cria a conta já confirmada; `erro` é o código do Supabase Auth (ex.: `email_exists`). */
  criarUsuario(email: string, senha: string): Promise<{ id: string } | { erro: string }>;
  /** Entra com a conta nova e chama `accept_teacher_invite`; `erro` é o código do banco. */
  aceitarConvite(email: string, senha: string, token: string): Promise<{ erro: string } | null>;
  apagarUsuario(id: string): Promise<void>;
  /** A conta já é professor? Confere um aceite cuja resposta se perdeu (ex.: timeout). */
  virouProfessor(id: string): Promise<boolean>;
};

export type Resultado = {
  status: number;
  corpo: { ok: true; email: string } | { error: string };
};

/** Estados de `get_invite_preview` que não deixam ativar, com o código que o app traduz. */
const ERRO_DO_ESTADO: Record<string, string> = {
  expired: "invite_expired",
  used: "invite_used",
  replaced: "invite_replaced",
  declined: "invite_declined",
};

/** Mesma regra do app (`senhaNova` em src/lib/formularios.ts): 8+ caracteres, letras e números. */
function senhaForte(senha: string) {
  return senha.length >= 8 && /\p{L}/u.test(senha) && /\d/.test(senha);
}

/** Erro devolvido ao app. Todo código daqui precisa de tradução em src/lib/erros.ts (há teste). */
function falha(codigo: string, status: number): Resultado {
  return { status, corpo: { error: codigo } };
}

export async function ativarProfessor(entrada: unknown, s: Servicos): Promise<Resultado> {
  const { token, senha } = (typeof entrada === "object" && entrada !== null ? entrada : {}) as {
    token?: unknown;
    senha?: unknown;
  };
  if (typeof token !== "string" || token === "" || typeof senha !== "string") {
    return falha("invalid_arguments", 400);
  }
  if (!senhaForte(senha)) return falha("weak_password", 400);

  let previa: unknown;
  try {
    previa = await s.lerPrevia(token);
  } catch (erro) {
    console.error("get_invite_preview falhou", erro);
    return falha("erro_desconhecido", 500);
  }
  const p = (typeof previa === "object" && previa !== null ? previa : {}) as Record<string, unknown>;
  if (p.state !== "valid") {
    const codigo = ERRO_DO_ESTADO[String(p.state)];
    return codigo ? falha(codigo, 409) : falha("invite_invalid", 409);
  }
  if (p.kind !== "teacher" || typeof p.email !== "string" || p.email === "") {
    return falha("invite_invalid", 409);
  }
  if (p.account_exists !== false) return falha("email_has_account", 409);
  const email = p.email;

  const criado = await s.criarUsuario(email, senha);
  if ("erro" in criado) {
    if (criado.erro === "email_exists" || criado.erro === "user_already_exists") {
      return falha("email_has_account", 409);
    }
    if (criado.erro === "weak_password") return falha("weak_password", 400);
    console.error("createUser falhou", criado.erro);
    return falha("erro_desconhecido", 500);
  }

  let erroDoAceite: string;
  try {
    const aceite = await s.aceitarConvite(email, senha, token);
    if (!aceite) return { status: 200, corpo: { ok: true, email } };
    erroDoAceite = aceite.erro;
  } catch (erro) {
    console.error("aceite falhou", erro);
    erroDoAceite = "";
  }
  // Código curto é o banco recusando (nada gravou). Fora isso, o aceite pode ter gravado sem a
  // resposta chegar: apagar a conta deixaria o convite usado e a pessoa sem acesso.
  const codigoDoBanco = /^[a-z_]+$/.test(erroDoAceite);
  if (!codigoDoBanco) {
    try {
      if (await s.virouProfessor(criado.id)) return { status: 200, corpo: { ok: true, email } };
    } catch (erro) {
      console.error(`não deu para conferir a conta ${criado.id}; ela fica`, erro);
      return falha("erro_desconhecido", 500);
    }
  }
  try {
    await s.apagarUsuario(criado.id);
  } catch (erro) {
    // A conta fica sem convite aceito (papel aluno); registra para limpar à mão.
    console.error(`não deu para apagar a conta ${criado.id}`, erro);
  }
  // Códigos curtos do banco (ex.: `invite_used`) seguem para o app; o resto é genérico.
  return codigoDoBanco ? falha(erroDoAceite, 409) : falha("erro_desconhecido", 500);
}
