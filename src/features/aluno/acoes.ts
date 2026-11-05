import { rpc } from "@/lib/rpc";

// Sem fila offline nesta etapa (a fila é a Etapa 3, regra 116): sem conexão, a chamada falha com
// o erro de sempre e a tela avisa.

export function marcarComoFeito(diaId: string, feitoEm: string) {
  return rpc("mark_done", {
    p_client_action_id: crypto.randomUUID(),
    p_client_ts: new Date().toISOString(),
    p_day_id: diaId,
    p_done_on: feitoEm,
  });
}

export function desfazerMarcacao(diaId: string, feitoEm: string) {
  return rpc("undo_done", { p_day_id: diaId, p_done_on: feitoEm });
}

export function salvarCarga(exercicioId: string, kg: number) {
  return rpc("set_load", {
    p_client_action_id: crypto.randomUUID(),
    p_edited_at: new Date().toISOString(),
    p_exercise_id: exercicioId,
    p_kg: kg,
  });
}
