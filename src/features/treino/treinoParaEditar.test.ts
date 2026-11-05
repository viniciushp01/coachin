import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerTreinoParaEditar, rascunhoDoTreino } from "./treinoParaEditar";

const respostas: Record<string, { data?: unknown; error?: unknown }> = {};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from(tabela: string) {
      const passo = {
        select: () => passo,
        eq: () => passo,
        neq: () => passo,
        is: () => passo,
        order: () => passo,
        maybeSingle: () => passo,
        then: (ok: (r: unknown) => unknown) =>
          Promise.resolve({ error: null, ...respostas[tabela] }).then(ok),
      };
      return passo;
    },
  },
}));

const TREINO = {
  name: "Hipertrofia",
  start_date: "2026-10-01",
  weeks: 8,
  suggested_frequency: null,
  letters_used: 3,
};
const FICHAS = [
  {
    id: "d-c",
    letter: "C",
    name: "Pernas",
    workout_exercises: [
      {
        exercise_id: "ex-2",
        position: 2,
        sets: 3,
        reps: "30",
        rest_seconds: 45,
        note: null,
        exercises: { name: "Prancha", measure: "time" },
      },
      {
        exercise_id: "ex-1",
        position: 1,
        sets: 4,
        reps: "10",
        rest_seconds: 90,
        note: "Devagar",
        exercises: { name: "Agachamento", measure: "reps" },
      },
    ],
  },
];
const VINCULO = {
  user_id: "u1",
  name: "Juliana Costa",
  link_status: "active",
  current_workout_id: "w1",
  scheduled_workout_id: null,
  has_open_request: false,
};

describe("rascunhoDoTreino", () => {
  it("mantém id e letra, e põe os exercícios na ordem", () => {
    const r = rascunhoDoTreino(TREINO, FICHAS);
    expect(r).toMatchObject({ inicio: "2026-10-01", semanas: 8, frequencia: "", letrasUsadas: 3 });
    expect(r.fichas[0]).toMatchObject({ id: "d-c", letra: "C", nome: "Pernas" });
    expect(r.fichas[0]!.exercicios.map((e) => e.nome)).toEqual(["Agachamento", "Prancha"]);
    expect(r.fichas[0]!.exercicios[0]).toMatchObject({
      exercicioId: "ex-1",
      series: 4,
      descanso: 90,
      observacao: "Devagar",
    });
    expect(r.fichas[0]!.exercicios[1]).toMatchObject({ medida: "time", observacao: "" });
  });
});

describe("lerTreinoParaEditar", () => {
  beforeEach(() => {
    respostas.teacher_student_list = { data: VINCULO };
    respostas.workouts = { data: TREINO };
    respostas.workout_days = { data: FICHAS };
    respostas.profiles = { data: { timezone: "America/Sao_Paulo" } };
  });

  it("lê o treino ativo", async () => {
    const lido = await lerTreinoParaEditar("a1", new Date("2026-10-30T15:00:00Z"));
    expect(lido?.treino.id).toBe("w1");
    expect(lido?.aluno).toMatchObject({ id: "a1", nome: "Juliana Costa", hoje: "2026-10-30" });
  });

  it.each([
    ["sem treino ativo", { current_workout_id: null }],
    ["com convite (#98)", { link_status: "invited" }],
    ["com pedido aberto, em que o rodapé só oferece criar", { has_open_request: true }],
  ])("%s: nulo", async (_caso, mudanca) => {
    respostas.teacher_student_list = { data: { ...VINCULO, ...mudanca } };
    expect(await lerTreinoParaEditar("a1")).toBeNull();
  });

  it("com agendado, ainda edita o ativo", async () => {
    respostas.teacher_student_list = { data: { ...VINCULO, scheduled_workout_id: "w2" } };
    expect(await lerTreinoParaEditar("a1")).not.toBeNull();
  });

  it("erro de leitura vira erro traduzido", async () => {
    respostas.workout_days = { error: { message: "forbidden" } };
    await expect(lerTreinoParaEditar("a1")).rejects.toMatchObject({ codigo: "forbidden" });
  });
});
