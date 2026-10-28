/**
 * Sessão de 30 dias sem uso (regra 121), controlada no app: o "Inactivity timeout" do
 * Supabase só existe no plano Pro (decisão em `docs/schema-coach-in.md`, seção 6).
 * Guarda no aparelho só o momento do último uso; nada mais é lido ou apagado aqui
 * (a fila local, regra 116, fica intacta).
 */

const CHAVE = "coachin:ultimo-uso";
const LIMITE = 30 * 24 * 60 * 60 * 1000;

/** Venceu se passaram mais de 30 dias desde o último uso. Sem registro, não vence. */
export function sessaoVencida(ultimoUso: number | null, agora: number): boolean {
  return ultimoUso !== null && agora - ultimoUso > LIMITE;
}

/** Momento do último uso neste aparelho, ou null se não houver (ou não der para ler). */
export function lerUltimoUso(): number | null {
  try {
    const valor = Number(localStorage.getItem(CHAVE));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

/** Marca agora como o último uso. Se o aparelho não deixar guardar, segue sem quebrar. */
export function registrarUso(agora = Date.now()) {
  try {
    localStorage.setItem(CHAVE, String(agora));
  } catch {
    // Sem armazenamento (ex.: modo privado restrito): a sessão só não vence por inatividade.
  }
}
