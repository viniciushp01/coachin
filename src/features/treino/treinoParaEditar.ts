import { acoesDoRodape, lerFuso } from "@/features/alunos/alunoVinculado";
import { hojeDoAluno } from "@/lib/diaDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import type { AlunoDoTreino } from "./alunoDoTreino";
import type { Medida } from "./medida";
import { novoExercicio, type Rascunho } from "./rascunho";

export type TreinoParaEditar = { id: string; rascunho: Rascunho };

type ExercicioLido = {
  exercise_id: string;
  position: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  note: string | null;
  exercises: { name: string; measure: string } | null;
};

type TreinoLido = {
  name: string;
  start_date: string;
  weeks: number;
  suggested_frequency: string | null;
  letters_used: number;
};

type FichaLida = { id: string; letter: string; name: string; workout_exercises: ExercicioLido[] };

/** O treino do banco no formato do rascunho: as fichas mantêm id e letra (regra 111). */
export function rascunhoDoTreino(treino: TreinoLido, fichas: FichaLida[]): Rascunho {
  return {
    nome: treino.name,
    inicio: treino.start_date,
    semanas: treino.weeks,
    frequencia: treino.suggested_frequency ?? "",
    letrasUsadas: treino.letters_used,
    fichas: fichas.map((ficha) => ({
      id: ficha.id,
      letra: ficha.letter,
      nome: ficha.name,
      exercicios: [...ficha.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .map((e) =>
          novoExercicio(
            {
              id: e.exercise_id,
              nome: e.exercises?.name ?? "",
              medida: e.exercises?.measure as Medida,
            },
            {
              series: e.sets,
              reps: e.reps,
              descanso: e.rest_seconds,
              observacao: e.note ?? "",
            },
          ),
        ),
    })),
  };
}

/**
 * O treino ativo do aluno, pronto para editar. Nulo se o rodapé da tela dele não oferece "Editar
 * treino" (regras 6 e 76); aluno com convite é o #98.
 */
export async function lerTreinoParaEditar(
  alunoId: string,
  agora = new Date(),
): Promise<{ aluno: AlunoDoTreino; treino: TreinoParaEditar } | null> {
  const resposta = await supabase
    .from("teacher_student_list")
    .select(
      "user_id, name, link_status, current_workout_id, scheduled_workout_id, has_open_request",
    )
    .eq("student_id", alunoId)
    .neq("link_status", "archived")
    .maybeSingle();
  if (resposta.error) throw erroDaResposta(resposta.error);
  const vinculo = resposta.data;
  const treinoId = vinculo?.current_workout_id;
  if (!vinculo || !treinoId || vinculo.link_status === "invited") return null;

  const acoes = acoesDoRodape({
    ativo: true,
    agendado: vinculo.scheduled_workout_id !== null,
    pedido: vinculo.has_open_request ?? false,
  });
  if (!acoes.includes("editar")) return null;

  const [treino, fichas, fuso] = await Promise.all([
    supabase
      .from("workouts")
      .select("name, start_date, weeks, suggested_frequency, letters_used")
      .eq("id", treinoId)
      .maybeSingle(),
    supabase
      .from("workout_days")
      .select(
        "id, letter, name, workout_exercises(exercise_id, position, sets, reps, rest_seconds, note, exercises(name, measure))",
      )
      .eq("workout_id", treinoId)
      .is("removed_at", null)
      .order("position"),
    lerFuso(vinculo.user_id),
  ]);
  if (treino.error) throw erroDaResposta(treino.error);
  if (fichas.error) throw erroDaResposta(fichas.error);
  if (!treino.data) return null;

  return {
    aluno: {
      id: alunoId,
      nome: vinculo.name ?? "",
      hoje: hojeDoAluno(fuso, agora),
      temTreinoAtual: true,
    },
    treino: { id: treinoId, rascunho: rascunhoDoTreino(treino.data, fichas.data) },
  };
}
