import { supabase } from "./supabase";

const CHAVE = "coachin:ultima-conta";

function guardar(id: string) {
  try {
    localStorage.setItem(CHAVE, id);
  } catch {
    // Sem armazenamento (janela privada): só perde a abertura sem conexão com o token vencido.
  }
}

function ultimaConta(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

/** O Supabase não renovou o token porque faltou rede (e não porque a sessão acabou). */
export function falhaDeRede(erro: { name?: string } | null) {
  return erro?.name === "AuthRetryableFetchError";
}

/**
 * Id da conta logada, lendo só o aparelho. Sem conexão com o token vencido, o Supabase não
 * devolve a sessão; aí vale a última conta que entrou neste aparelho, para o app abrir com o
 * treino guardado e a fila (regra 116). Sair é a única coisa que limpa a sessão de verdade.
 */
export async function contaAtual(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (session) {
    guardar(session.user.id);
    return session.user.id;
  }
  return falhaDeRede(error) ? ultimaConta() : null;
}
