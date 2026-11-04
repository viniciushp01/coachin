import { erroDaResposta } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import type { Medida } from "./medida";

export type ExercicioDaBusca = {
  id: string;
  nome: string;
  measure: Medida;
  /** "Peito · barra reta" ou "Seu exercício" (regra 151 (2)). */
  detalhe: string;
};

const comecoMinusculo = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/** O equipamento principal (posição 1) de cada exercício. */
async function lerEquipamentos(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const resposta = await supabase
    .from("exercise_equipment")
    .select("exercise_id, equipment(name)")
    .eq("position", 1)
    .in("exercise_id", ids);
  if (resposta.error) throw erroDaResposta(resposta.error);
  return new Map(resposta.data.map((l) => [l.exercise_id, l.equipment.name]));
}

/** Busca por nome e apelido (regra 74), já com o texto da linha do resultado. */
export async function buscarExercicios(termo: string): Promise<ExercicioDaBusca[]> {
  const exercicios = await rpc("search_exercises", { p_query: termo });
  const equipamentos = await lerEquipamentos(exercicios.map((e) => e.id));
  return exercicios.map((e) => {
    const equipamento = equipamentos.get(e.id);
    const partes = [e.muscle_group, equipamento && comecoMinusculo(equipamento)].filter(Boolean);
    return {
      id: e.id,
      nome: e.name,
      measure: e.measure as Medida,
      detalhe: e.owner_id ? "Seu exercício" : partes.join(" · "),
    };
  });
}
