import type { ExercicioDaFicha } from "@/features/aluno/dados";
import { lerFuso } from "@/features/alunos/alunoVinculado";
import type { Medida } from "@/features/treino/medida";
import { hojeDoAluno } from "@/lib/diaDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import { diaNoFuso, type FichaMarcada, type MarcacaoDoDia } from "./logica";

// Leituras do professor acompanhando o aluno (regras 61 a 63, 68 a 72). Só `select`: a RLS já deixa
// o professor ver marcações, cargas, perfil e treinos dos alunos ativos dele. Nada aqui grava.

export type AlunoAcompanhado = {
  id: string;
  /** Conta do aluno (`students.user_id`); as cargas e o perfil são dela. */
  contaId: string;
  nome: string;
  fuso: string | null;
  /** "Hoje" no fuso do aluno (regra 115). */
  hoje: string;
};

/**
 * O aluno com acesso ativo, ou nulo: convite pendente, expirado ou recusado não tem conta nem
 * marcações (regra 79), e arquivado ou de outro professor a RLS não mostra.
 */
export async function lerAlunoAcompanhado(
  alunoId: string,
  agora = new Date(),
): Promise<AlunoAcompanhado | null> {
  const resposta = await supabase
    .from("teacher_student_list")
    .select("student_id, user_id, name, link_status")
    .eq("student_id", alunoId)
    .maybeSingle();
  if (resposta.error) throw erroDaResposta(resposta.error);
  const aluno = resposta.data;
  if (!aluno || aluno.link_status !== "active" || !aluno.user_id || !aluno.student_id) return null;
  const fuso = await lerFuso(aluno.user_id);
  return {
    id: aluno.student_id,
    contaId: aluno.user_id,
    nome: aluno.name ?? "",
    fuso,
    hoje: hojeDoAluno(fuso, agora),
  };
}

// ---------------------------------------------------------------- Calendário

export type DadosDoCalendario = {
  aluno: AlunoAcompanhado;
  fichas: FichaMarcada[];
  marcacoes: MarcacaoDoDia[];
  treinos: { inicio: string; fim: string }[];
  /** Fim do treino ativo (o último que já começou), para o aviso de concluído (regras 43 e 72). */
  fimDoAtivo: string | null;
};

export async function lerCalendario(
  alunoId: string,
  agora = new Date(),
): Promise<DadosDoCalendario | null> {
  const aluno = await lerAlunoAcompanhado(alunoId, agora);
  if (!aluno) return null;
  const [treinos, marcacoes] = await Promise.all([
    supabase
      .from("workouts")
      .select(
        "id, start_date, end_date, workout_days(id, letter, name, removed_at, workout_exercises(exercise_id))",
      )
      .eq("student_id", alunoId),
    supabase.from("completions").select("day_id, done_on").eq("student_id", alunoId),
  ]);
  if (treinos.error) throw erroDaResposta(treinos.error);
  if (marcacoes.error) throw erroDaResposta(marcacoes.error);

  const lista = treinos.data.flatMap((t) => (t.end_date ? [{ ...t, end_date: t.end_date }] : []));
  const ativo = lista
    .filter((t) => t.start_date <= aluno.hoje)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
  return {
    aluno,
    // A ficha removida fica aqui: as marcações antigas mantêm o nome dela (regra 7).
    fichas: lista.flatMap((t) =>
      t.workout_days.map((d) => ({
        id: d.id,
        treinoId: t.id,
        letra: d.letter,
        nome: d.name,
        removida: d.removed_at !== null,
        exercicios: d.workout_exercises.length,
      })),
    ),
    marcacoes: marcacoes.data.map((m) => ({ diaId: m.day_id, feitoEm: m.done_on })),
    treinos: lista.map((t) => ({ inicio: t.start_date, fim: t.end_date })),
    fimDoAtivo: ativo?.end_date ?? null,
  };
}

// ---------------------------------------------------------------- Ficha em modo leitura

export type FichaEmLeitura = {
  aluno: AlunoAcompanhado;
  letra: string;
  nome: string;
  removida: boolean;
  treino: { nome: string; inicio: string; fim: string };
  exercicios: (ExercicioDaFicha & { carga: { kg: number; dia: string } | null })[];
};

/** A ficha como está agora (regra 112), com a carga que o aluno registrou em cada exercício. */
export async function lerFichaEmLeitura(
  alunoId: string,
  diaId: string,
  agora = new Date(),
): Promise<FichaEmLeitura | null> {
  const aluno = await lerAlunoAcompanhado(alunoId, agora);
  if (!aluno) return null;
  const [ficha, cargas] = await Promise.all([
    supabase
      .from("workout_days")
      .select(
        "id, letter, name, removed_at, workouts!inner(name, start_date, end_date, student_id), workout_exercises(exercise_id, position, sets, reps, rest_seconds, note, exercises(name, measure, load_mode))",
      )
      .eq("id", diaId)
      .maybeSingle(),
    supabase
      .from("student_exercise_loads")
      .select("exercise_id, kg, edited_at")
      .eq("user_id", aluno.contaId),
  ]);
  if (ficha.error) throw erroDaResposta(ficha.error);
  if (cargas.error) throw erroDaResposta(cargas.error);
  const dia = ficha.data;
  // Ficha de outro aluno do mesmo professor não abre por este caminho.
  if (!dia?.workouts || dia.workouts.student_id !== alunoId || !dia.workouts.end_date) return null;

  const cargaDe = new Map(cargas.data.map((c) => [c.exercise_id, c]));
  return {
    aluno,
    letra: dia.letter,
    nome: dia.name,
    removida: dia.removed_at !== null,
    treino: {
      nome: dia.workouts.name,
      inicio: dia.workouts.start_date,
      fim: dia.workouts.end_date,
    },
    exercicios: [...dia.workout_exercises]
      .sort((a, b) => a.position - b.position)
      .map((e) => {
        const carga = cargaDe.get(e.exercise_id);
        return {
          exercicioId: e.exercise_id,
          nome: e.exercises?.name ?? "",
          medida: (e.exercises?.measure ?? "reps") as Medida,
          modoDeCarga: (e.exercises?.load_mode ?? "required") as ExercicioDaFicha["modoDeCarga"],
          series: e.sets,
          reps: e.reps,
          descanso: e.rest_seconds,
          observacao: e.note,
          carga: carga
            ? { kg: Number(carga.kg), dia: diaNoFuso(carga.edited_at, aluno.fuso) }
            : null,
        };
      }),
  };
}

// ---------------------------------------------------------------- Progressão de carga

export type CargaDoExercicio = { exercicioId: string; nome: string; kg: number; dia: string };

/**
 * Os exercícios com carga registrada, do que mudou há mais pouco para o mais antigo (regra 44).
 * Exercício sem carga (regra 123) nunca aparece.
 */
export async function lerProgressao(
  alunoId: string,
  agora = new Date(),
): Promise<{ aluno: AlunoAcompanhado; exercicios: CargaDoExercicio[] } | null> {
  const aluno = await lerAlunoAcompanhado(alunoId, agora);
  if (!aluno) return null;
  const cargas = await supabase
    .from("student_exercise_loads")
    .select("exercise_id, kg, edited_at, exercises(name, load_mode)")
    .eq("user_id", aluno.contaId)
    .order("edited_at", { ascending: false });
  if (cargas.error) throw erroDaResposta(cargas.error);
  return {
    aluno,
    exercicios: cargas.data
      .filter((c) => c.exercises && c.exercises.load_mode !== "none")
      .map((c) => ({
        exercicioId: c.exercise_id,
        nome: c.exercises?.name ?? "",
        kg: Number(c.kg),
        dia: diaNoFuso(c.edited_at, aluno.fuso),
      })),
  };
}

export type HistoricoDeCargas = {
  aluno: AlunoAcompanhado;
  exercicio: CargaDoExercicio;
  historico: { kg: number; dia: string }[];
};

/** A carga atual do exercício e as anteriores, da mais recente para a mais antiga (regra 63). */
export async function lerHistoricoDeCargas(
  alunoId: string,
  exercicioId: string,
  agora = new Date(),
): Promise<HistoricoDeCargas | null> {
  const aluno = await lerAlunoAcompanhado(alunoId, agora);
  if (!aluno) return null;
  const [atual, historico] = await Promise.all([
    supabase
      .from("student_exercise_loads")
      .select("exercise_id, kg, edited_at, exercises(name, load_mode)")
      .eq("user_id", aluno.contaId)
      .eq("exercise_id", exercicioId)
      .maybeSingle(),
    supabase
      .from("load_history")
      .select("kg, edited_at")
      .eq("user_id", aluno.contaId)
      .eq("exercise_id", exercicioId)
      .order("edited_at", { ascending: false }),
  ]);
  if (atual.error) throw erroDaResposta(atual.error);
  if (historico.error) throw erroDaResposta(historico.error);
  const carga = atual.data;
  if (!carga?.exercises || carga.exercises.load_mode === "none") return null;
  return {
    aluno,
    exercicio: {
      exercicioId,
      nome: carga.exercises.name,
      kg: Number(carga.kg),
      dia: diaNoFuso(carga.edited_at, aluno.fuso),
    },
    historico: historico.data.map((h) => ({
      kg: Number(h.kg),
      dia: diaNoFuso(h.edited_at, aluno.fuso),
    })),
  };
}

// ---------------------------------------------------------------- Histórico de treinos

export type TreinoAnterior = {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  semanas: number;
  letras: string[];
};

/**
 * Os treinos encerrados: os que já começaram, menos o ativo (o de início mais recente, que segue
 * ativo mesmo depois do fim, regra 43). O agendado não entra, e o mais novo vem primeiro.
 */
export async function lerHistorico(
  alunoId: string,
  agora = new Date(),
): Promise<{ aluno: AlunoAcompanhado; treinos: TreinoAnterior[] } | null> {
  const aluno = await lerAlunoAcompanhado(alunoId, agora);
  if (!aluno) return null;
  const treinos = await supabase
    .from("workouts")
    .select("id, name, start_date, end_date, weeks, workout_days(letter, removed_at)")
    .eq("student_id", alunoId)
    .lte("start_date", aluno.hoje)
    .order("start_date", { ascending: false });
  if (treinos.error) throw erroDaResposta(treinos.error);
  return {
    aluno,
    treinos: treinos.data.slice(1).flatMap((t) =>
      t.end_date
        ? [
            {
              id: t.id,
              nome: t.name,
              inicio: t.start_date,
              fim: t.end_date,
              semanas: t.weeks,
              letras: t.workout_days.filter((d) => d.removed_at === null).map((d) => d.letter),
            },
          ]
        : [],
    ),
  };
}

// ---------------------------------------------------------------- Perfil

export type PerfilDoAluno = {
  aluno: AlunoAcompanhado;
  nascimento: string | null;
  telefone: string | null;
  altura: number | null;
  peso: number | null;
  restricoes: string | null;
  /** Dia da última atualização, no fuso do aluno; nulo se ele ainda não preencheu o perfil. */
  atualizadoEm: string | null;
};

export async function lerPerfil(
  alunoId: string,
  agora = new Date(),
): Promise<PerfilDoAluno | null> {
  const aluno = await lerAlunoAcompanhado(alunoId, agora);
  if (!aluno) return null;
  const perfil = await supabase
    .from("student_profiles")
    .select("birth_date, phone, height_m, weight_kg, restrictions, updated_at, completed_at")
    .eq("user_id", aluno.contaId)
    .maybeSingle();
  if (perfil.error) throw erroDaResposta(perfil.error);
  const p = perfil.data;
  return {
    aluno,
    nascimento: p?.birth_date ?? null,
    telefone: p?.phone ?? null,
    altura: p?.height_m === null || p?.height_m === undefined ? null : Number(p.height_m),
    peso: p?.weight_kg === null || p?.weight_kg === undefined ? null : Number(p.weight_kg),
    restricoes: p?.restrictions?.trim() ? p.restrictions : null,
    atualizadoEm: p?.completed_at ? diaNoFuso(p.updated_at, aluno.fuso) : null,
  };
}
