import { erroDaResposta } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import type { ModoDeCarga } from "./exercicioNovo";
import type { Medida } from "./medida";

export type ExercicioDaBusca = {
  id: string;
  nome: string;
  medida: Medida;
  carga: ModoDeCarga;
  /** Criado pelo professor: só esses podem ser ajustados (regra 148). */
  proprio: boolean;
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
      medida: e.measure as Medida,
      carga: e.load_mode as ModoDeCarga,
      proprio: e.owner_id !== null,
      detalhe: e.owner_id ? "Seu exercício" : partes.join(" · "),
    };
  });
}

/**
 * Em quantas fichas não removidas de treino ativo ou agendado o exercício está (regra 151 (4)):
 * treino encerrado fica de fora, porque não dá mais para editar. Repetido na ficha conta uma vez.
 */
export async function contarFichasDoExercicio(exercicioId: string) {
  const [alunos, fichas] = await Promise.all([
    supabase.from("teacher_student_list").select("current_workout_id, scheduled_workout_id"),
    supabase
      .from("workout_exercises")
      .select("day_id, workout_days!inner(workout_id)")
      .eq("exercise_id", exercicioId)
      .is("workout_days.removed_at", null),
  ]);
  if (alunos.error) throw erroDaResposta(alunos.error);
  if (fichas.error) throw erroDaResposta(fichas.error);
  const vigentes = new Set(
    alunos.data.flatMap((a) => [a.current_workout_id, a.scheduled_workout_id]),
  );
  return new Set(
    fichas.data.filter((l) => vigentes.has(l.workout_days.workout_id)).map((l) => l.day_id),
  ).size;
}

/** Só muda o exercício: repetições das fichas, carga e histórico ficam como estão (regra 123). */
export async function ajustarExercicio({
  exercicio,
  medida,
  carga,
}: {
  exercicio: ExercicioDaBusca;
  medida: Medida;
  carga: ModoDeCarga;
}): Promise<ExercicioDaBusca> {
  const ajustado = await rpc("set_exercise_settings", {
    p_exercise_id: exercicio.id,
    p_load_mode: carga,
    p_measure: medida,
  });
  return {
    ...exercicio,
    medida: ajustado.measure as Medida,
    carga: ajustado.load_mode as ModoDeCarga,
  };
}
