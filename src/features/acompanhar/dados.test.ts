import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  lerAlunoAcompanhado,
  lerCalendario,
  lerFichaEmLeitura,
  lerHistoricoDeCargas,
  lerHistorico,
  lerPerfil,
  lerProgressao,
} from "./dados";

// O banco de mentira: cada tabela responde com o que o teste deixou em `respostas`. O teste não
// prova o filtro do servidor (a RLS), só o que o app pede e como ele monta a resposta.
const respostas: Record<string, { data?: unknown; error?: unknown }> = {};
const consultas: { tabela: string; filtros: unknown[][]; colunas: string }[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from(tabela: string) {
      const consulta = { tabela, filtros: [] as unknown[][], colunas: "" };
      consultas.push(consulta);
      const filtra = (...filtro: unknown[]) => (consulta.filtros.push(filtro), passo);
      const passo = {
        select: (colunas: string) => ((consulta.colunas = colunas), passo),
        eq: filtra,
        lte: filtra,
        order: () => passo,
        maybeSingle: () => passo,
        then: (ok: (r: unknown) => unknown) =>
          Promise.resolve({ error: null, ...respostas[tabela] }).then(ok),
      };
      return passo;
    },
  },
}));

const AGORA = new Date("2026-10-29T15:00:00Z");

const vinculo = {
  student_id: "a1",
  user_id: "u1",
  name: "Vinicius Alves",
  link_status: "active",
};

beforeEach(() => {
  for (const tabela of Object.keys(respostas)) delete respostas[tabela];
  consultas.length = 0;
  respostas.teacher_student_list = { data: vinculo };
  respostas.profiles = { data: { timezone: "America/Sao_Paulo" } };
});

describe("lerAlunoAcompanhado (regra 79)", () => {
  it("aluno ativo: conta, fuso e hoje no fuso dele", async () => {
    // 02h de 30/10 em UTC ainda é 29/10 em São Paulo.
    const aluno = await lerAlunoAcompanhado("a1", new Date("2026-10-30T02:00:00Z"));
    expect(aluno).toEqual({
      id: "a1",
      contaId: "u1",
      nome: "Vinicius Alves",
      fuso: "America/Sao_Paulo",
      hoje: "2026-10-29",
    });
  });

  it.each([
    [
      "convite pendente, expirado ou recusado",
      { ...vinculo, link_status: "invited", user_id: null },
    ],
    ["arquivado", { ...vinculo, link_status: "archived" }],
    ["sem conta", { ...vinculo, user_id: null }],
    ["que a RLS esconde (de outro professor)", null],
  ])("aluno %s: nada de acompanhamento", async (_nome, linha) => {
    respostas.teacher_student_list = { data: linha };
    expect(await lerAlunoAcompanhado("a1", AGORA)).toBeNull();
    expect(await lerCalendario("a1", AGORA)).toBeNull();
    expect(await lerProgressao("a1", AGORA)).toBeNull();
    expect(await lerHistorico("a1", AGORA)).toBeNull();
    expect(await lerPerfil("a1", AGORA)).toBeNull();
    expect(consultas.some((c) => c.tabela === "completions" || c.tabela === "workouts")).toBe(
      false,
    );
  });
});

describe("lerCalendario (regras 7, 43, 61 e 72)", () => {
  const treino = (id: string, inicio: string, fim: string, dias: unknown[]) => ({
    id,
    start_date: inicio,
    end_date: fim,
    workout_days: dias,
  });
  const dia = (id: string, letter: string, extra?: Record<string, unknown>) => ({
    id,
    letter,
    name: `Ficha ${letter}`,
    removed_at: null,
    workout_exercises: [{ exercise_id: "e1" }, { exercise_id: "e2" }],
    ...extra,
  });

  it("junta as fichas de todos os treinos, a ficha removida e as marcações do aluno", async () => {
    respostas.workouts = {
      data: [
        treino("w1", "2026-08-10", "2026-10-04", [dia("d0", "A")]),
        treino("w2", "2026-10-05", "2026-11-29", [
          dia("d1", "A"),
          dia("d2", "B", { removed_at: "2026-10-20T12:00:00Z" }),
        ]),
      ],
    };
    respostas.completions = {
      data: [
        { day_id: "d2", done_on: "2026-10-27" },
        { day_id: "d0", done_on: "2026-09-01" },
      ],
    };
    const dados = await lerCalendario("a1", AGORA);
    expect(dados?.fichas).toEqual([
      { id: "d0", treinoId: "w1", letra: "A", nome: "Ficha A", removida: false, exercicios: 2 },
      { id: "d1", treinoId: "w2", letra: "A", nome: "Ficha A", removida: false, exercicios: 2 },
      { id: "d2", treinoId: "w2", letra: "B", nome: "Ficha B", removida: true, exercicios: 2 },
    ]);
    expect(dados?.marcacoes).toEqual([
      { diaId: "d2", feitoEm: "2026-10-27" },
      { diaId: "d0", feitoEm: "2026-09-01" },
    ]);
    expect(dados?.fimDoAtivo).toBe("2026-11-29");
    expect(consultas.find((c) => c.tabela === "completions")?.filtros).toEqual([
      ["student_id", "a1"],
    ]);
  });

  it("o treino ativo é o último que já começou: o agendado não conta", async () => {
    respostas.workouts = {
      data: [
        treino("w1", "2026-10-05", "2026-10-25", []),
        treino("w2", "2026-11-02", "2026-12-27", []),
      ],
    };
    respostas.completions = { data: [] };
    expect((await lerCalendario("a1", AGORA))?.fimDoAtivo).toBe("2026-10-25");
  });

  it("sem treino nenhum: calendário vazio, sem fim", async () => {
    respostas.workouts = { data: [] };
    respostas.completions = { data: [] };
    expect(await lerCalendario("a1", AGORA)).toMatchObject({
      fichas: [],
      marcacoes: [],
      treinos: [],
      fimDoAtivo: null,
    });
  });
});

describe("lerFichaEmLeitura (regras 69 e 112)", () => {
  const exercicio = (id: string, posicao: number, extra?: Record<string, unknown>) => ({
    exercise_id: id,
    position: posicao,
    sets: 4,
    reps: "10",
    rest_seconds: 90,
    note: null,
    exercises: { name: `Exercício ${id}`, measure: "reps", load_mode: "required" },
    ...extra,
  });
  const fichaLida = (extra?: Record<string, unknown>) => ({
    id: "d2",
    letter: "B",
    name: "Costas e bíceps",
    removed_at: null,
    workouts: {
      name: "Hipertrofia · Fase 2",
      start_date: "2026-10-05",
      end_date: "2026-11-29",
      student_id: "a1",
    },
    workout_exercises: [
      exercicio("e2", 2, { note: "Costas retas." }),
      exercicio("e1", 1),
      exercicio("e3", 3, {
        exercises: { name: "Alongamento", measure: "time", load_mode: "none" },
      }),
    ],
    ...extra,
  });

  it("exercícios na ordem, com a carga do aluno no fuso dele", async () => {
    respostas.workout_days = { data: fichaLida() };
    respostas.student_exercise_loads = {
      data: [{ exercise_id: "e1", kg: "55.00", edited_at: "2026-10-22T01:30:00Z" }],
    };
    const ficha = await lerFichaEmLeitura("a1", "d2", AGORA);
    expect(ficha?.letra).toBe("B");
    expect(ficha?.treino).toEqual({
      nome: "Hipertrofia · Fase 2",
      inicio: "2026-10-05",
      fim: "2026-11-29",
    });
    expect(ficha?.exercicios.map((e) => e.exercicioId)).toEqual(["e1", "e2", "e3"]);
    expect(ficha?.exercicios[0]?.carga).toEqual({ kg: 55, dia: "2026-10-21" });
    expect(ficha?.exercicios[1]).toMatchObject({ observacao: "Costas retas.", carga: null });
    expect(ficha?.exercicios[2]).toMatchObject({ modoDeCarga: "none", medida: "time" });
    expect(consultas.find((c) => c.tabela === "student_exercise_loads")?.filtros).toEqual([
      ["user_id", "u1"],
    ]);
  });

  it("ficha removida abre com a marca de removida", async () => {
    respostas.workout_days = { data: fichaLida({ removed_at: "2026-10-20T12:00:00Z" }) };
    respostas.student_exercise_loads = { data: [] };
    expect((await lerFichaEmLeitura("a1", "d2", AGORA))?.removida).toBe(true);
  });

  it("ficha de outro aluno (ou que não existe) não abre por este caminho", async () => {
    respostas.student_exercise_loads = { data: [] };
    respostas.workout_days = {
      data: fichaLida({ workouts: { ...fichaLida().workouts, student_id: "a9" } }),
    };
    expect(await lerFichaEmLeitura("a1", "d2", AGORA)).toBeNull();
    respostas.workout_days = { data: null };
    expect(await lerFichaEmLeitura("a1", "d2", AGORA)).toBeNull();
  });
});

describe("lerProgressao (regras 44, 63 e 123)", () => {
  it("lista os exercícios com carga, sem os de carga 'não', com a data no fuso do aluno", async () => {
    respostas.student_exercise_loads = {
      data: [
        {
          exercise_id: "e1",
          kg: "55.00",
          edited_at: "2026-10-22T15:00:00Z",
          exercises: { name: "Puxada frontal", load_mode: "required" },
        },
        {
          exercise_id: "e2",
          kg: "62.50",
          edited_at: "2026-10-20T01:00:00Z",
          exercises: { name: "Supino reto", load_mode: "optional" },
        },
        {
          exercise_id: "e3",
          kg: "10.00",
          edited_at: "2026-10-19T15:00:00Z",
          exercises: { name: "Alongamento", load_mode: "none" },
        },
      ],
    };
    const dados = await lerProgressao("a1", AGORA);
    expect(dados?.exercicios).toEqual([
      { exercicioId: "e1", nome: "Puxada frontal", kg: 55, dia: "2026-10-22" },
      { exercicioId: "e2", nome: "Supino reto", kg: 62.5, dia: "2026-10-19" },
    ]);
    expect(consultas.find((c) => c.tabela === "student_exercise_loads")?.filtros).toEqual([
      ["user_id", "u1"],
    ]);
  });

  it("sem nenhuma carga: lista vazia", async () => {
    respostas.student_exercise_loads = { data: [] };
    expect((await lerProgressao("a1", AGORA))?.exercicios).toEqual([]);
  });
});

describe("lerHistoricoDeCargas (regra 63)", () => {
  it("carga atual e histórico, do mais recente ao mais antigo, no fuso do aluno", async () => {
    respostas.student_exercise_loads = {
      data: {
        exercise_id: "e1",
        kg: "55.00",
        edited_at: "2026-10-22T15:00:00Z",
        exercises: { name: "Puxada frontal", load_mode: "required" },
      },
    };
    respostas.load_history = {
      data: [
        { kg: "55.00", edited_at: "2026-10-22T15:00:00Z" },
        { kg: "50.00", edited_at: "2026-10-08T15:00:00Z" },
      ],
    };
    const dados = await lerHistoricoDeCargas("a1", "e1", AGORA);
    expect(dados?.exercicio).toEqual({
      exercicioId: "e1",
      nome: "Puxada frontal",
      kg: 55,
      dia: "2026-10-22",
    });
    expect(dados?.historico).toEqual([
      { kg: 55, dia: "2026-10-22" },
      { kg: 50, dia: "2026-10-08" },
    ]);
    expect(consultas.find((c) => c.tabela === "load_history")?.filtros).toEqual([
      ["user_id", "u1"],
      ["exercise_id", "e1"],
    ]);
  });

  it("exercício sem carga registrada (ou de carga 'não'): nada", async () => {
    respostas.load_history = { data: [] };
    respostas.student_exercise_loads = { data: null };
    expect(await lerHistoricoDeCargas("a1", "e1", AGORA)).toBeNull();
    respostas.student_exercise_loads = {
      data: {
        exercise_id: "e1",
        kg: "5.00",
        edited_at: "2026-10-22T15:00:00Z",
        exercises: { name: "Alongamento", load_mode: "none" },
      },
    };
    expect(await lerHistoricoDeCargas("a1", "e1", AGORA)).toBeNull();
  });
});

describe("lerHistorico (regras 43 e 68)", () => {
  const treino = (id: string, nome: string, inicio: string, fim: string, semanas: number) => ({
    id,
    name: nome,
    start_date: inicio,
    end_date: fim,
    weeks: semanas,
    workout_days: [
      { letter: "B", removed_at: null },
      { letter: "A", removed_at: null },
      { letter: "C", removed_at: "2026-09-01T12:00:00Z" },
    ],
  });

  it("tira o treino ativo (o primeiro da lista) e mantém a ordem do mais novo ao mais antigo", async () => {
    respostas.workouts = {
      data: [
        treino("w3", "Hipertrofia · Fase 2", "2026-10-05", "2026-11-29", 8),
        treino("w2", "Hipertrofia · Fase 1", "2026-08-10", "2026-10-04", 8),
        treino("w1", "Adaptação", "2026-07-06", "2026-08-09", 5),
      ],
    };
    const dados = await lerHistorico("a1", AGORA);
    expect(dados?.treinos).toEqual([
      {
        id: "w2",
        nome: "Hipertrofia · Fase 1",
        inicio: "2026-08-10",
        fim: "2026-10-04",
        semanas: 8,
        letras: ["B", "A"],
      },
      {
        id: "w1",
        nome: "Adaptação",
        inicio: "2026-07-06",
        fim: "2026-08-09",
        semanas: 5,
        letras: ["B", "A"],
      },
    ]);
    // Só os que já começaram: o agendado fica de fora (e o ativo, pelo slice).
    expect(consultas.find((c) => c.tabela === "workouts")?.filtros).toEqual([
      ["student_id", "a1"],
      ["start_date", "2026-10-29"],
    ]);
  });

  it("um treino só (o ativo): nenhum anterior", async () => {
    respostas.workouts = { data: [treino("w1", "Único", "2026-10-05", "2026-11-29", 8)] };
    expect((await lerHistorico("a1", AGORA))?.treinos).toEqual([]);
  });
});

describe("lerPerfil (regras 41, 71 e 108)", () => {
  it("dados do aluno, com 'atualizado em' no fuso dele", async () => {
    respostas.student_profiles = {
      data: {
        birth_date: "1994-03-14",
        phone: "+5531987654321",
        height_m: "1.78",
        weight_kg: "82.00",
        restrictions: "Dor leve no ombro direito ao fazer supino.",
        updated_at: "2026-10-21T01:30:00Z",
        completed_at: "2026-10-01T12:00:00Z",
      },
    };
    expect(await lerPerfil("a1", AGORA)).toMatchObject({
      nascimento: "1994-03-14",
      telefone: "+5531987654321",
      altura: 1.78,
      peso: 82,
      restricoes: "Dor leve no ombro direito ao fazer supino.",
      atualizadoEm: "2026-10-20",
    });
    expect(consultas.find((c) => c.tabela === "student_profiles")?.filtros).toEqual([
      ["user_id", "u1"],
    ]);
  });

  it("perfil ainda não preenchido ou restrição em branco: campos vazios, sem data", async () => {
    respostas.student_profiles = { data: null };
    expect(await lerPerfil("a1", AGORA)).toMatchObject({
      nascimento: null,
      telefone: null,
      altura: null,
      peso: null,
      restricoes: null,
      atualizadoEm: null,
    });
    respostas.student_profiles = {
      data: {
        birth_date: null,
        phone: null,
        height_m: null,
        weight_kg: null,
        restrictions: "   ",
        updated_at: "2026-10-21T01:30:00Z",
        completed_at: null,
      },
    };
    expect(await lerPerfil("a1", AGORA)).toMatchObject({ restricoes: null, atualizadoEm: null });
  });
});
