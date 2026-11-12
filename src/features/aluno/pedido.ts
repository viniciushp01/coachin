import { comLimite } from "@/lib/filaLocal";
import { rpc } from "@/lib/rpc";

/**
 * O pedido de novo treino, visto pelo aluno (regras 40, 52 e 103):
 * `nenhum` mostra "Solicitar novo treino"; `aberto` mostra "Solicitação enviada" e o link
 * "Cancelar solicitação"; `atendendo` (o professor já montou o treino, ainda agendado) mostra só
 * "Solicitação enviada".
 */
export type EstadoDoPedido = "nenhum" | "aberto" | "atendendo";

const DO_BANCO: Record<string, EstadoDoPedido> = {
  none: "nenhum",
  open: "aberto",
  acted: "atendendo",
};

export async function lerEstadoDoPedido(): Promise<EstadoDoPedido> {
  return DO_BANCO[await rpc("my_request_status")] ?? "nenhum";
}

/**
 * Pedir e cancelar exigem conexão e não entram na fila local (regra 116). A falta de conexão é
 * detectada pelo resultado da tentativa (falha ou tempo esgotado): lança `sem_conexao`.
 */
const LIMITE_MS = 8000;

export async function pedirNovoTreino() {
  await comLimite(rpc("request_new_workout"), LIMITE_MS);
}

export async function cancelarPedido() {
  await comLimite(rpc("cancel_training_request"), LIMITE_MS);
}
