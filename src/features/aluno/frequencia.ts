import type { FichaMarcada, MarcacaoDoDia } from "@/features/acompanhar/logica";
import type { TreinoDoAluno } from "./dados";

/**
 * O treino que o painel do dia da Frequência edita (regras 20 a 24 e 61). O calendário mostra
 * todos os meses e treinos; marcar e desfazer só valem no treino ativo, do início até hoje
 * (`podeMarcar`). As fichas e marcações de treinos anteriores entram só para mostrar o nome e a
 * letra, sem "Abrir ficha" (`removida`) e sem marcar. Sem treino ativo, nada é marcável.
 */
export function treinoDoPainel(
  ativo: TreinoDoAluno | null,
  hoje: string,
  fichas: FichaMarcada[],
  marcacoes: MarcacaoDoDia[],
): TreinoDoAluno {
  const base: TreinoDoAluno = ativo ?? {
    id: "",
    nome: "",
    // Início depois de qualquer "hoje": `podeMarcar` nunca vale.
    inicio: "9999-12-31",
    fim: "9999-12-31",
    hoje,
    semana: { atual: 1, total: 1 },
    progresso: 0,
    concluido: false,
    fichas: [],
    marcacoes: [],
    cargas: {},
  };
  const conhecidas = new Set(base.fichas.map((f) => f.id));
  return {
    ...base,
    fichas: [
      ...base.fichas,
      ...fichas
        .filter((f) => !conhecidas.has(f.id))
        .map((f) => ({
          id: f.id,
          letra: f.letra,
          nome: f.nome,
          posicao: 999,
          removida: true,
          exercicios: [],
        })),
    ],
    marcacoes: [
      ...base.marcacoes,
      ...marcacoes
        .filter((m) => !conhecidas.has(m.diaId))
        .map((m) => ({ diaId: m.diaId, feitoEm: m.feitoEm, marcadaEm: m.feitoEm })),
    ],
  };
}
