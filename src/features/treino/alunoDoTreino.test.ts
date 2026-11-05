import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerAlunoDoTreino } from "./alunoDoTreino";

const respostas: Record<string, { data?: unknown; error?: unknown }> = {};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from(tabela: string) {
      const passo = {
        select: () => passo,
        eq: () => passo,
        neq: () => passo,
        maybeSingle: () => passo,
        then: (ok: (r: unknown) => unknown) =>
          Promise.resolve({ error: null, ...respostas[tabela] }).then(ok),
      };
      return passo;
    },
  },
}));

const AGORA = new Date("2026-10-30T01:00:00Z");

const vinculo = {
  student_id: "a1",
  user_id: "u1",
  name: "Juliana Costa",
  link_status: "active",
  current_workout_id: null,
  scheduled_workout_id: null,
  has_open_request: false,
};

beforeEach(() => {
  respostas.teacher_student_list = { data: vinculo };
  respostas.profiles = { data: { timezone: "Asia/Tokyo" } };
});

describe("lerAlunoDoTreino", () => {
  it("devolve o nome e o hoje no fuso do aluno (regra 115)", async () => {
    expect(await lerAlunoDoTreino("a1", AGORA)).toEqual({
      id: "a1",
      nome: "Juliana Costa",
      hoje: "2026-10-30",
      temTreinoAtual: false,
      convite: null,
    });
  });

  it("com pedido aberto e treino atual, cria e sabe do anterior (regra 150 (1))", async () => {
    respostas.teacher_student_list = {
      data: { ...vinculo, current_workout_id: "w1", has_open_request: true },
    };
    expect(await lerAlunoDoTreino("a1", AGORA)).toMatchObject({ temTreinoAtual: true });
  });

  it.each([
    ["convite_pendente", "pendente"],
    ["convite_expirado", "expirado"],
    ["convite_recusado", "recusado"],
  ])(
    "aluno com convite (%s) também recebe treino antes do aceite (regra 122)",
    async (lista, convite) => {
      respostas.teacher_student_list = {
        data: { ...vinculo, user_id: null, link_status: "invited", list_status: lista },
      };
      // Sem conta não há fuso: vale São Paulo (29/10 22:00).
      expect(await lerAlunoDoTreino("a1", AGORA)).toMatchObject({
        convite,
        temTreinoAtual: false,
        hoje: "2026-10-29",
      });
    },
  );

  it.each([
    ["não existe", null],
    ["tem treino ativo sem pedido", { ...vinculo, current_workout_id: "w1" }],
    ["tem treino agendado", { ...vinculo, scheduled_workout_id: "w2" }],
  ])("nulo quando o aluno %s: o rodapé não oferece criar", async (_, data) => {
    respostas.teacher_student_list = { data };
    expect(await lerAlunoDoTreino("a1", AGORA)).toBeNull();
  });
});
