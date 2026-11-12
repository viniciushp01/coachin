import { beforeEach, describe, expect, it, vi } from "vitest";
import { acoesDoRodape, lerTelaDoAluno } from "./alunoVinculado";

describe("acoesDoRodape (regras 68, 77 e 106)", () => {
  const casos = [
    { ativo: true, agendado: false, pedido: false, acoes: ["editar", "agendar"] },
    { ativo: true, agendado: false, pedido: true, acoes: ["criar"] },
    { ativo: true, agendado: true, pedido: false, acoes: ["editar"] },
    { ativo: true, agendado: true, pedido: true, acoes: ["editar"] },
    { ativo: false, agendado: false, pedido: false, acoes: ["criar"] },
    { ativo: false, agendado: false, pedido: true, acoes: ["criar"] },
    { ativo: false, agendado: true, pedido: false, acoes: [] },
    { ativo: false, agendado: true, pedido: true, acoes: [] },
  ];
  it.each(casos)(
    "ativo $ativo, agendado $agendado, pedido $pedido: $acoes",
    ({ ativo, agendado, pedido, acoes }) => {
      expect(acoesDoRodape({ ativo, agendado, pedido })).toEqual(acoes);
    },
  );
});

// O banco de mentira: cada tabela responde com o que o teste deixou em `respostas`.
const respostas: Record<string, { data?: unknown; count?: number; error?: unknown }> = {};
const consultas: { tabela: string; filtros: unknown[][] }[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from(tabela: string) {
      const consulta = { tabela, filtros: [] as unknown[][] };
      consultas.push(consulta);
      const passo = {
        select: () => passo,
        eq: (...filtro: unknown[]) => (consulta.filtros.push(filtro), passo),
        neq: () => passo,
        lte: (...filtro: unknown[]) => (consulta.filtros.push(filtro), passo),
        order: () => passo,
        limit: () => passo,
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
  list_status: "ativo",
  current_workout_id: "w1",
  current_workout_name: "Hipertrofia · Fase 2",
  current_start_date: "2026-10-05",
  current_end_date: "2026-11-29",
  current_concluded: false,
  scheduled_workout_id: null,
  has_open_request: false,
};

function responder(linha: unknown) {
  respostas.teacher_student_list = { data: linha };
  respostas.profiles = { data: { timezone: "America/Sao_Paulo" } };
  respostas.completions = { count: 12 };
  // 21/10 01h30 em UTC é 20/10 22h30 em São Paulo; 3 treinos começados = 2 anteriores ao ativo.
  respostas.student_profiles = {
    data: { updated_at: "2026-10-21T01:30:00Z", completed_at: "2026-10-01T12:00:00Z" },
  };
  respostas.workouts = { count: 3 };
}

beforeEach(() => {
  for (const tabela of Object.keys(respostas)) delete respostas[tabela];
  consultas.length = 0;
});

describe("lerTelaDoAluno: a tela sai do status do vínculo", () => {
  it("aluno de outro professor ou arquivado (a RLS esconde): nenhuma tela", async () => {
    responder(null);
    await expect(lerTelaDoAluno("a1", AGORA)).resolves.toBeNull();
  });

  it("aluno com convite: a tela de convite", async () => {
    responder({ ...vinculo, link_status: "invited", list_status: "convite_pendente" });
    respostas.students = {
      data: { id: "a1", name: "Rafael Torres", email: null, status: "invited" },
    };
    respostas.invites = {
      data: {
        id: "i1",
        status: "pending",
        expires_at: "2026-11-03T12:00:00Z",
        created_at: "2026-10-27T12:00:00Z",
        declined_at: null,
        email_sent_at: null,
      },
    };
    const tela = await lerTelaDoAluno("a1", AGORA);
    expect(tela).toMatchObject({ tela: "convite", dados: { aluno: { nome: "Rafael Torres" } } });
  });

  const conviteLido = (extra?: Record<string, unknown>) => ({
    id: "i1",
    status: "pending",
    expires_at: "2026-11-03T12:00:00Z",
    created_at: "2026-10-27T12:00:00Z",
    declined_at: null,
    email_sent_at: null,
    ...extra,
  });

  it("aluno com convite e treino salvo: cartão sem treino feito e Editar treino (regras 122 e 153)", async () => {
    responder({
      ...vinculo,
      user_id: null,
      link_status: "invited",
      list_status: "convite_pendente",
      current_start_date: "2026-10-29",
      current_end_date: "2026-12-23",
    });
    respostas.students = {
      data: { id: "a1", name: "Rafael Torres", email: null, status: "invited" },
    };
    respostas.invites = { data: conviteLido() };
    const tela = await lerTelaDoAluno("a1", AGORA);
    expect(tela).toMatchObject({
      tela: "convite",
      dados: {
        treino: {
          cartao: {
            nome: "Hipertrofia · Fase 2",
            situacao: "8 semanas",
            feitos: 0,
            progresso: 0,
            inicio: "29/10",
            fim: "23/12",
          },
          agendado: false,
          acoes: ["editar", "agendar"],
        },
      },
    });
    // Antes do aceite não há marcação: nem consulta.
    expect(consultas.some((c) => c.tabela === "completions")).toBe(false);
  });

  it("aluno com convite recusado e sem treino: Criar treino", async () => {
    responder({
      ...vinculo,
      user_id: null,
      link_status: "invited",
      list_status: "convite_recusado",
      current_workout_id: null,
      current_start_date: null,
      current_end_date: null,
    });
    respostas.students = {
      data: { id: "a1", name: "Rafael Torres", email: null, status: "invited" },
    };
    respostas.invites = {
      data: conviteLido({ status: "declined", declined_at: "2026-10-28T12:00:00Z" }),
    };
    expect(await lerTelaDoAluno("a1", AGORA)).toMatchObject({
      dados: { treino: { cartao: null, agendado: false, acoes: ["criar"] } },
    });
  });

  it("aluno com convite que já não está visível: nenhuma tela", async () => {
    responder({ ...vinculo, link_status: "invited", list_status: "convite_pendente" });
    respostas.students = { data: null };
    await expect(lerTelaDoAluno("a1", AGORA)).resolves.toBeNull();
  });

  it("aluno vinculado com treino: cartão com semana, feitos e datas do treino atual", async () => {
    responder(vinculo);
    expect(await lerTelaDoAluno("a1", AGORA)).toEqual({
      tela: "vinculado",
      dados: {
        id: "a1",
        nome: "Vinicius Alves",
        status: "ativo",
        treino: {
          nome: "Hipertrofia · Fase 2",
          situacao: "Semana 4 de 8",
          progresso: 25 / 56,
          feitos: 12,
          inicio: "05/10",
          fim: "29/11",
        },
        agendado: false,
        acoes: ["editar", "agendar"],
        perfilAtualizadoEm: "2026-10-20",
        treinosAnteriores: 2,
      },
    });
    const contagem = consultas.find((c) => c.tabela === "completions");
    expect(contagem?.filtros).toEqual([["workout_id", "w1"]]);
  });

  it("atalhos: o perfil sem preenchimento não tem data, e sem treino anterior o número é 0", async () => {
    responder(vinculo);
    respostas.student_profiles = {
      data: { updated_at: "2026-10-21T01:30:00Z", completed_at: null },
    };
    respostas.workouts = { count: 1 };
    expect(await lerTelaDoAluno("a1", AGORA)).toMatchObject({
      dados: { perfilAtualizadoEm: null, treinosAnteriores: 0 },
    });
    respostas.student_profiles = { data: null };
    respostas.workouts = { count: 0 };
    expect(await lerTelaDoAluno("a1", AGORA)).toMatchObject({
      dados: { perfilAtualizadoEm: null, treinosAnteriores: 0 },
    });
  });

  it("os treinos anteriores contam os que já começaram no fuso do aluno (o agendado fica fora)", async () => {
    responder(vinculo);
    await lerTelaDoAluno("a1", AGORA);
    const contagem = consultas.find((c) => c.tabela === "workouts");
    expect(contagem?.filtros).toEqual([
      ["student_id", "a1"],
      ["start_date", "2026-10-29"],
    ]);
  });

  it("a semana segue o fuso do aluno, não o do aparelho", async () => {
    responder(vinculo);
    // 17h de 11/10 em São Paulo (dia 7) e 05h de 12/10 em Tóquio (dia 8).
    const virada = new Date("2026-10-11T20:00:00Z");
    const semana = async () => {
      const tela = await lerTelaDoAluno("a1", virada);
      return tela?.tela === "vinculado" ? tela.dados.treino?.situacao : undefined;
    };
    expect(await semana()).toBe("Semana 1 de 8");
    respostas.profiles = { data: { timezone: "Asia/Tokyo" } };
    expect(await semana()).toBe("Semana 2 de 8");
  });

  it("treino concluído: troca a semana e enche a barra (regra 5)", async () => {
    responder({ ...vinculo, current_concluded: true });
    const tela = await lerTelaDoAluno("a1", new Date("2026-12-10T15:00:00Z"));
    expect(tela).toMatchObject({
      dados: { treino: { situacao: "Treino concluído", progresso: 1 } },
    });
  });

  it("sem treino ativo: sem cartão e sem contar treinos", async () => {
    responder({
      ...vinculo,
      list_status: "sem_treino",
      current_workout_id: null,
      current_workout_name: null,
      current_start_date: null,
      current_end_date: null,
    });
    const tela = await lerTelaDoAluno("a1", AGORA);
    expect(tela).toMatchObject({
      tela: "vinculado",
      dados: { status: "sem_treino", treino: null, acoes: ["criar"] },
    });
    expect(consultas.some((c) => c.tabela === "completions")).toBe(false);
  });

  it("erro de leitura não vira tela vazia", async () => {
    responder(vinculo);
    respostas.completions = { error: { message: "falhou", code: "500" } };
    await expect(lerTelaDoAluno("a1", AGORA)).rejects.toBeInstanceOf(Error);
  });
});
