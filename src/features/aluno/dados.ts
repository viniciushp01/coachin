import { lerFuso } from "@/features/alunos/alunoVinculado";
import type { Medida } from "@/features/treino/medida";
import { hojeDoAluno, progressoDoTreino, semanaDoTreino } from "@/lib/diaDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import type { DiaDaFicha, Marcacao } from "./logica";

export type ExercicioDaFicha = {
  exercicioId: string;
  nome: string;
  medida: Medida;
  /** required e optional mostram a carga; none não (regra 123). */
  modoDeCarga: "required" | "optional" | "none";
  series: number;
  reps: string;
  descanso: number;
  observacao: string | null;
};

export type FichaDoAluno = DiaDaFicha & { nome: string; exercicios: ExercicioDaFicha[] };
export type CargaDoExercicio = { kg: number; editadaEm: string };

export type TreinoDoAluno = {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  hoje: string;
  semana: { atual: number; total: number };
  progresso: number;
  concluido: boolean;
  fichas: FichaDoAluno[];
  marcacoes: Marcacao[];
  cargas: Record<string, CargaDoExercicio>;
};

/** O que o aluno vê no Início: o treino ativo ou nada (regra 1). */
export type DadosDoAluno = { hoje: string; treino: TreinoDoAluno | null };

/** O treino ativo é o de início mais recente que já começou (o agendado fica oculto, regra 2). */
export async function lerTreinoDoAluno(agora = new Date()): Promise<DadosDoAluno> {
  const sessao = await supabase.auth.getSession();
  const contaId = sessao.data.session?.user.id ?? null;
  const fuso = await lerFuso(contaId);
  const hoje = hojeDoAluno(fuso, agora);

  const treinos = await supabase
    .from("workouts")
    .select("id, name, start_date, end_date")
    .lte("start_date", hoje)
    .order("start_date", { ascending: false })
    .limit(1);
  if (treinos.error) throw erroDaResposta(treinos.error);
  const treino = treinos.data[0];
  if (!treino?.end_date) return { hoje, treino: null };

  const [dias, marcacoes, cargas] = await Promise.all([
    supabase
      .from("workout_days")
      .select(
        "id, letter, name, position, removed_at, workout_exercises(exercise_id, position, sets, reps, rest_seconds, note, exercises(name, measure, load_mode))",
      )
      .eq("workout_id", treino.id),
    supabase.from("completions").select("day_id, done_on, marked_at").eq("workout_id", treino.id),
    supabase.from("student_exercise_loads").select("exercise_id, kg, edited_at"),
  ]);
  if (dias.error) throw erroDaResposta(dias.error);
  if (marcacoes.error) throw erroDaResposta(marcacoes.error);
  if (cargas.error) throw erroDaResposta(cargas.error);

  const concluido = hoje > treino.end_date;
  return {
    hoje,
    treino: {
      id: treino.id,
      nome: treino.name,
      inicio: treino.start_date,
      fim: treino.end_date,
      hoje,
      semana: semanaDoTreino(treino.start_date, treino.end_date, hoje),
      progresso: concluido ? 1 : progressoDoTreino(treino.start_date, treino.end_date, hoje),
      concluido,
      fichas: dias.data
        .map((d) => ({
          id: d.id,
          letra: d.letter,
          nome: d.name,
          posicao: d.position,
          removida: d.removed_at !== null,
          exercicios: [...d.workout_exercises]
            .sort((a, b) => a.position - b.position)
            .map((e) => ({
              exercicioId: e.exercise_id,
              nome: e.exercises?.name ?? "",
              medida: (e.exercises?.measure ?? "reps") as Medida,
              modoDeCarga: (e.exercises?.load_mode ??
                "required") as ExercicioDaFicha["modoDeCarga"],
              series: e.sets,
              reps: e.reps,
              descanso: e.rest_seconds,
              observacao: e.note,
            })),
        }))
        .sort((a, b) => a.posicao - b.posicao),
      marcacoes: marcacoes.data.map((m) => ({
        diaId: m.day_id,
        feitoEm: m.done_on,
        marcadaEm: m.marked_at,
      })),
      cargas: Object.fromEntries(
        cargas.data.map((c) => [c.exercise_id, { kg: Number(c.kg), editadaEm: c.edited_at }]),
      ),
    },
  };
}
