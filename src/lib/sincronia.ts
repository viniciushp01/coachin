import { contaAtual } from "./conta";
import { enviarFila, listarFila, type ResultadoDoEnvio } from "./filaLocal";

/**
 * Envio da fila local (regra 116). No MVP a fila sai quando o app abre, volta a ficar visível,
 * a conexão volta ou depois de uma ação do aluno; com o app fechado não há envio (iOS não deixa).
 */

export type AvisoDeSincronia = ResultadoDoEnvio & { silencioso: boolean };
type Ouvinte = (aviso: AvisoDeSincronia) => void;

const ouvintes = new Set<Ouvinte>();

export function aoSincronizar(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  return () => void ouvintes.delete(ouvinte);
}

const REENVIO_MS = 30_000;
let reenvio: ReturnType<typeof setTimeout> | undefined;

/** Envia a fila da conta atual. `silencioso`: quem chamou já avisa o aluno (ex.: ao marcar). */
export async function sincronizar(silencioso = false): Promise<ResultadoDoEnvio | null> {
  const conta = await contaAtual();
  if (!conta) return null;
  const resultado = await enviarFila(conta);
  clearTimeout(reenvio);
  // Ficou algo na fila: tenta de novo daqui a pouco enquanto o app estiver aberto.
  if (resultado.parou) reenvio = setTimeout(() => void sincronizar(), REENVIO_MS);
  if (resultado.enviados.length > 0 || resultado.descartados.length > 0) {
    for (const ouvinte of ouvintes) ouvinte({ ...resultado, silencioso });
  }
  return resultado;
}

/** Quantos registros da conta atual aguardam envio. */
export async function contarPendentes(): Promise<number> {
  const conta = await contaAtual();
  return conta ? (await listarFila(conta)).length : 0;
}

/** Liga o envio automático: ao abrir, ao voltar a ficar visível e quando a conexão volta. */
export function iniciarSincronia() {
  const tentar = () => void sincronizar().catch(() => undefined);
  const aoVisivel = () => document.visibilityState === "visible" && tentar();
  document.addEventListener("visibilitychange", aoVisivel);
  window.addEventListener("online", tentar);
  tentar();
  return () => {
    document.removeEventListener("visibilitychange", aoVisivel);
    window.removeEventListener("online", tentar);
    clearTimeout(reenvio);
  };
}
