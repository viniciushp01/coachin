import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ErroApp } from "./erros";
import { rpc } from "./rpc";

/**
 * Fila local de envio e cópia do treino ativo (regra 116), em IndexedDB.
 *
 * - Cada item tem um id único (`p_client_action_id`): reenviar o mesmo item não duplica no banco.
 * - Cada item guarda a hora em que o aluno fez a ação (`criadoEm`): a "última carga" segue a data
 *   da edição, não a do envio (regras 28 e 116).
 * - Cada item guarda a conta que o criou. Sair NÃO apaga a fila (regra 121), e uma conta só envia
 *   os próprios itens.
 * - O envio é em ordem. Falha de rede (ou de servidor, ou sessão vencida) para o envio e o resto
 *   fica; erro de regra (ex.: `day_removed`) descarta só aquele item e segue.
 */

export type AcaoDaFila =
  | { tipo: "marcar"; diaId: string; feitoEm: string }
  | { tipo: "desfazer"; diaId: string; feitoEm: string }
  | { tipo: "carga"; exercicioId: string; kg: number };

export type ItemDaFila = {
  /** Posição na fila (cresce a cada item); define a ordem de envio. */
  seq: number;
  /** Identificador único da ação, enviado ao banco para aceitar o reenvio sem duplicar. */
  id: string;
  contaId: string;
  /** Hora em que o aluno fez a ação (ISO). */
  criadoEm: string;
  acao: AcaoDaFila;
};

interface BancoLocal extends DBSchema {
  fila: { key: number; value: ItemDaFila; indexes: { porConta: string } };
  copia: { key: string; value: { contaId: string; valor: unknown } };
}

let conexao: Promise<IDBPDatabase<BancoLocal>> | null = null;

function banco() {
  conexao ??= openDB<BancoLocal>("coachin-local", 1, {
    upgrade(db) {
      const fila = db.createObjectStore("fila", { keyPath: "seq", autoIncrement: true });
      fila.createIndex("porConta", "contaId");
      db.createObjectStore("copia", { keyPath: "contaId" });
    },
  });
  return conexao;
}

/** Só para testes: descarta a conexão guardada (o banco em memória é trocado entre os testes). */
export function reiniciarConexao() {
  conexao = null;
}

export async function enfileirar(
  contaId: string,
  acao: AcaoDaFila,
  agora = new Date(),
): Promise<ItemDaFila> {
  const db = await banco();
  const item = { id: crypto.randomUUID(), contaId, criadoEm: agora.toISOString(), acao };
  const seq = await db.add("fila", item as ItemDaFila);
  return { ...item, seq };
}

/** Os itens da conta, na ordem de envio. */
export async function listarFila(contaId: string): Promise<ItemDaFila[]> {
  const db = await banco();
  const itens = await db.getAllFromIndex("fila", "porConta", contaId);
  return itens.sort((a, b) => a.seq - b.seq);
}

export async function guardarCopia(contaId: string, valor: unknown) {
  await (await banco()).put("copia", { contaId, valor });
}

export async function lerCopia<T>(contaId: string): Promise<T | null> {
  const registro = await (await banco()).get("copia", contaId);
  return (registro?.valor as T | undefined) ?? null;
}

/** Envia um item ao banco. */
export function executarItem(item: ItemDaFila): Promise<unknown> {
  const { acao } = item;
  switch (acao.tipo) {
    case "marcar":
      return rpc("mark_done", {
        p_client_action_id: item.id,
        p_client_ts: item.criadoEm,
        p_day_id: acao.diaId,
        p_done_on: acao.feitoEm,
      });
    case "desfazer":
      // `undo_done` já é idempotente no banco (desfazer o que não existe não faz nada).
      return rpc("undo_done", { p_day_id: acao.diaId, p_done_on: acao.feitoEm });
    case "carga":
      return rpc("set_load", {
        p_client_action_id: item.id,
        p_edited_at: item.criadoEm,
        p_exercise_id: acao.exercicioId,
        p_kg: acao.kg,
      });
  }
}

/** Falhas que passam sozinhas: rede, servidor fora do ar, sessão vencida. O item fica na fila. */
const TEMPORARIOS = new Set(["sem_conexao", "erro_desconhecido", "not_authenticated"]);

export const LIMITE_DE_ENVIO_MS = 15_000;

export function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const t = setTimeout(() => rejeitar(new ErroApp("sem_conexao")), ms);
    promessa.then(
      (v) => {
        clearTimeout(t);
        resolver(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        rejeitar(e instanceof Error ? e : new ErroApp("erro_desconhecido"));
      },
    );
  });
}

export type ResultadoDoEnvio = {
  /** Itens aceitos pelo banco (e removidos da fila). */
  enviados: number[];
  /** Itens que o banco recusou por regra (removidos da fila). */
  descartados: { seq: number; erro: ErroApp }[];
  /** O envio parou numa falha temporária; sobraram itens na fila. */
  parou: boolean;
};

/** Motivo da recusa de cada item descartado; quem enfileirou lê com `consumirDescarte`. */
const descartes = new Map<number, ErroApp>();
export function consumirDescarte(seq: number): ErroApp | null {
  const erro = descartes.get(seq) ?? null;
  descartes.delete(seq);
  return erro;
}

let andamento: Promise<unknown> = Promise.resolve();

/**
 * Envia a fila da conta, em ordem, um item de cada vez. Chamadas ao mesmo tempo esperam a
 * anterior terminar (o item nunca sai duas vezes ao mesmo tempo).
 */
export function enviarFila(
  contaId: string,
  executar: (item: ItemDaFila) => Promise<unknown> = executarItem,
  limiteMs = LIMITE_DE_ENVIO_MS,
): Promise<ResultadoDoEnvio> {
  const vez = andamento.then(() => enviarEmOrdem(contaId, executar, limiteMs));
  andamento = vez.catch(() => undefined);
  return vez;
}

async function enviarEmOrdem(
  contaId: string,
  executar: (item: ItemDaFila) => Promise<unknown>,
  limiteMs: number,
): Promise<ResultadoDoEnvio> {
  const db = await banco();
  const resultado: ResultadoDoEnvio = { enviados: [], descartados: [], parou: false };
  for (const item of await listarFila(contaId)) {
    try {
      await comLimite(
        Promise.resolve().then(() => executar(item)),
        limiteMs,
      );
      resultado.enviados.push(item.seq);
    } catch (erro) {
      const erroApp = erro instanceof ErroApp ? erro : new ErroApp("erro_desconhecido");
      if (TEMPORARIOS.has(erroApp.codigo)) {
        resultado.parou = true;
        return resultado;
      }
      resultado.descartados.push({ seq: item.seq, erro: erroApp });
      descartes.set(item.seq, erroApp);
    }
    await db.delete("fila", item.seq);
  }
  return resultado;
}
