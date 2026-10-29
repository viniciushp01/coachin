/**
 * Convite guardado no aparelho enquanto a pessoa cria a conta, confirma o e-mail e entra
 * (regras 79 e 89): depois do login, a raiz do app leva de volta ao convite (`destinoDaRaiz`).
 * Fica só no aparelho, como a marca de último uso da sessão (`src/lib/inatividade.ts`).
 */
const CHAVE = "coachin.convite";
/** Validade do convite de aluno (regra 48): depois disso o token não serve mais. */
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

type Guardado = { token: string; em: number };

export function guardarConvite(token: string, agora = Date.now()) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ token, em: agora } satisfies Guardado));
  } catch {
    // Sem armazenamento (modo privado restrito): o convite só não sobrevive ao login.
  }
}

export function lerConviteGuardado(agora = Date.now()): string | null {
  let guardado: Partial<Guardado>;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    guardado = JSON.parse(bruto) as Partial<Guardado>;
  } catch {
    return null;
  }
  if (typeof guardado.token !== "string" || typeof guardado.em !== "number") return null;
  if (agora - guardado.em > VALIDADE_MS) {
    apagarConviteGuardado();
    return null;
  }
  return guardado.token;
}

export function apagarConviteGuardado() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a apagar.
  }
}
