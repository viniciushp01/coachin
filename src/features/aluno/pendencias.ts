import { hojeDoAluno, progressoDoTreino, semanaDoTreino } from "@/lib/diaDoAluno";
import type { ItemDaFila } from "@/lib/filaLocal";
import type { DadosDoAluno, TreinoDoAluno } from "./dados";

/**
 * Põe por cima do treino lido (do servidor ou da cópia do aparelho) o que ainda está na fila de
 * envio (regra 116): o aluno enxerga o que acabou de fazer mesmo sem conexão.
 * Marcar a mesma ficha no mesmo dia duas vezes não duplica; desfazer tira a marcação; a carga
 * mais recente por data da edição vale (regra 28).
 */
export function aplicarFila(dados: DadosDoAluno, itens: ItemDaFila[]): DadosDoAluno {
  const { treino } = dados;
  if (!treino || itens.length === 0) return { ...dados, pendentes: itens.length };

  let marcacoes = [...treino.marcacoes];
  const cargas = { ...treino.cargas };
  for (const item of itens) {
    const { acao } = item;
    if (acao.tipo === "marcar") {
      const jaTem = marcacoes.some((m) => m.diaId === acao.diaId && m.feitoEm === acao.feitoEm);
      if (!jaTem) {
        marcacoes.push({
          diaId: acao.diaId,
          feitoEm: acao.feitoEm,
          marcadaEm: item.criadoEm,
          pendente: true,
        });
      }
    } else if (acao.tipo === "desfazer") {
      marcacoes = marcacoes.filter((m) => !(m.diaId === acao.diaId && m.feitoEm === acao.feitoEm));
    } else {
      const atual = cargas[acao.exercicioId];
      if (!atual || atual.editadaEm <= item.criadoEm) {
        cargas[acao.exercicioId] = { kg: acao.kg, editadaEm: item.criadoEm, pendente: true };
      }
    }
  }
  return { ...dados, pendentes: itens.length, treino: { ...treino, marcacoes, cargas } };
}

/**
 * A cópia guardada pode ter dias de idade: refaz o "hoje" e o que depende dele com a data do
 * aparelho e o fuso do aluno guardado junto com a cópia.
 */
export function atualizarDia(dados: DadosDoAluno, agora = new Date()): DadosDoAluno {
  const { treino } = dados;
  const hoje = hojeDoAluno(dados.fuso, agora);
  if (!treino || hoje === dados.hoje) return { ...dados, hoje };
  const concluido = hoje > treino.fim;
  const novo: TreinoDoAluno = {
    ...treino,
    hoje,
    concluido,
    semana: semanaDoTreino(treino.inicio, treino.fim, hoje),
    progresso: concluido ? 1 : progressoDoTreino(treino.inicio, treino.fim, hoje),
  };
  return { ...dados, hoje, treino: novo };
}
