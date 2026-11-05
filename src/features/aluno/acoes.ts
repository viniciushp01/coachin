import { ErroApp } from "@/lib/erros";
import { contaAtual } from "@/lib/conta";
import { consumirDescarte, enfileirar, listarFila, type AcaoDaFila } from "@/lib/filaLocal";
import { sincronizar } from "@/lib/sincronia";

/** `enviado`: o banco já aceitou. `guardado`: sem conexão; fica no aparelho e vai depois. */
export type SituacaoDoEnvio = "enviado" | "guardado";

/**
 * Toda escrita do aluno entra na fila local e tenta sair na hora (regra 116): assim a ordem
 * é sempre a das ações do aluno, com ou sem conexão. Se o banco recusar por regra, lança o erro.
 */
async function registrar(acao: AcaoDaFila): Promise<SituacaoDoEnvio> {
  const conta = await contaAtual();
  if (!conta) throw new ErroApp("not_authenticated");
  const item = await enfileirar(conta, acao);
  await sincronizar(true);
  if ((await listarFila(conta)).some((i) => i.seq === item.seq)) return "guardado";
  const recusa = consumirDescarte(item.seq);
  if (recusa) throw recusa;
  return "enviado";
}

export function marcarComoFeito(diaId: string, feitoEm: string) {
  return registrar({ tipo: "marcar", diaId, feitoEm });
}

export function desfazerMarcacao(diaId: string, feitoEm: string) {
  return registrar({ tipo: "desfazer", diaId, feitoEm });
}

export function salvarCarga(exercicioId: string, kg: number) {
  return registrar({ tipo: "carga", exercicioId, kg });
}
