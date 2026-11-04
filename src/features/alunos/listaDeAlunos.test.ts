import { describe, expect, it } from "vitest";
import {
  CHIP_DO_ALUNO,
  linhaDoAluno,
  montarLista,
  resumoDaLista,
  ultimoTreino,
  type AlunoDaLista,
} from "./listaDeAlunos";

const HOJE = "2026-11-03";

function aluno(a: Partial<AlunoDaLista> & Pick<AlunoDaLista, "student_id" | "name">) {
  return {
    list_status: "ativo",
    invite_id: null,
    invite_expires_at: null,
    invite_declined_at: null,
    current_end_date: null,
    current_concluded: false,
    scheduled_start_date: null,
    last_done_on: null,
    last_done_letter: null,
    has_open_request: false,
    ...a,
  } as AlunoDaLista;
}

describe("linhaDoAluno (regras 55, 102, 122 e 147)", () => {
  it("vinculado (ativo, sem treino, quase no fim): id, nome e status", () => {
    for (const status of ["ativo", "sem_treino", "quase_no_fim"] as const) {
      const linha = linhaDoAluno(
        aluno({ student_id: "a1", name: "Ana", list_status: status }),
        HOJE,
      );
      expect(linha).toMatchObject({ id: "a1", nome: "Ana", status });
    }
  });

  it("convite pendente: enviado em e vale até", () => {
    const linha = linhaDoAluno(
      aluno({
        student_id: "a1",
        name: "Rafael Torres",
        list_status: "convite_pendente",
        invite_id: "c1",
        invite_expires_at: "2026-11-03T12:00:00-03:00",
      }),
      HOJE,
      "2026-10-27T12:00:00-03:00",
    );
    expect(linha).toMatchObject({
      status: "convite_pendente",
      detalhe: "Convite enviado em 27/10 · vale até 03/11",
    });
  });

  it("convite expirado: a data em que expirou", () => {
    const linha = linhaDoAluno(
      aluno({
        student_id: "a1",
        name: "Beatriz Nunes",
        list_status: "convite_expirado",
        invite_id: "c1",
        invite_expires_at: "2026-10-24T12:00:00-03:00",
      }),
      HOJE,
      "2026-10-17T12:00:00-03:00",
    );
    expect(linha).toMatchObject({ detalhe: "Convite expirou em 24/10" });
  });

  it("convite recusado: a data da recusa (e só o fato, sem ela)", () => {
    const recusado = aluno({
      student_id: "a1",
      name: "Bruno Dias",
      list_status: "convite_recusado",
      invite_id: "c1",
      invite_expires_at: "2026-11-03T12:00:00-03:00",
      invite_declined_at: "2026-10-27T12:00:00-03:00",
    });
    expect(linhaDoAluno(recusado, HOJE)).toMatchObject({
      detalhe: "Recusou o convite em 27/10",
    });
    expect(linhaDoAluno({ ...recusado, invite_declined_at: null }, HOJE).detalhe).toBe(
      "Recusou o convite",
    );
  });
});

describe("CHIP_DO_ALUNO (regras 34, 55 e 102; design.md)", () => {
  it("tom e texto de cada status", () => {
    expect(CHIP_DO_ALUNO).toEqual({
      ativo: { tom: "success", texto: "Ativo" },
      sem_treino: { tom: "neutral", texto: "Sem treino" },
      quase_no_fim: { tom: "warning", texto: "Quase no fim" },
      convite_pendente: { tom: "info", texto: "Convite pendente" },
      convite_expirado: { tom: "neutral", texto: "Convite expirado" },
      convite_recusado: { tom: "neutral", texto: "Convite recusado" },
    });
  });
});

describe("ultimoTreino (regra 147 (1)), com hoje injetado", () => {
  it("hoje, ontem, a data com 2 dias ou mais, e nunca", () => {
    expect(ultimoTreino("2026-11-03", HOJE)).toBe("treinou hoje");
    expect(ultimoTreino("2026-11-02", HOJE)).toBe("treinou ontem");
    expect(ultimoTreino("2026-11-01", HOJE)).toBe("último treino em 01/11");
    expect(ultimoTreino("2026-10-27", HOJE)).toBe("último treino em 27/10");
    expect(ultimoTreino(null, HOJE)).toBe("ainda não treinou");
  });

  it("na virada do dia, o mesmo treino passa de hoje a ontem e depois à data", () => {
    expect(ultimoTreino("2026-11-02", "2026-11-02")).toBe("treinou hoje");
    expect(ultimoTreino("2026-11-02", "2026-11-03")).toBe("treinou ontem");
    expect(ultimoTreino("2026-11-02", "2026-11-04")).toBe("último treino em 02/11");
  });

  it("na virada do mês e do ano", () => {
    expect(ultimoTreino("2026-10-31", "2026-11-01")).toBe("treinou ontem");
    expect(ultimoTreino("2026-12-31", "2027-01-01")).toBe("treinou ontem");
    expect(ultimoTreino("2026-12-30", "2027-01-01")).toBe("último treino em 30/12");
  });

  it("marcação adiante do aparelho (aluno em outro fuso) conta como hoje", () => {
    expect(ultimoTreino("2026-11-04", HOJE)).toBe("treinou hoje");
  });
});

describe("detalhe do aluno vinculado (regras 43, 56 e 147 (1); Figma Lista · 1)", () => {
  const detalhe = (a: Partial<AlunoDaLista>) =>
    linhaDoAluno(aluno({ student_id: "a1", name: "Ana", ...a }), HOJE).detalhe;

  it("ativo: último treino e ficha", () => {
    expect(
      detalhe({
        current_end_date: "2026-12-01",
        last_done_on: "2026-10-27",
        last_done_letter: "B",
      }),
    ).toBe("Último treino em 27/10 · Ficha B");
    expect(
      detalhe({
        current_end_date: "2026-12-01",
        last_done_on: "2026-11-02",
        last_done_letter: "B",
      }),
    ).toBe("Treinou ontem · Ficha B");
    expect(
      detalhe({
        current_end_date: "2026-12-01",
        last_done_on: "2026-11-03",
        last_done_letter: "A",
      }),
    ).toBe("Treinou hoje · Ficha A");
  });

  it("ativo sem nenhum treino: ainda não treinou", () => {
    expect(detalhe({ current_end_date: "2026-12-01" })).toBe("Ainda não treinou");
  });

  it("ativo com treino concluído: a data de fim e o último treino", () => {
    const concluido = { current_end_date: "2026-10-25", current_concluded: true };
    expect(detalhe({ ...concluido, last_done_on: "2026-11-02", last_done_letter: "B" })).toBe(
      "Treino concluído em 25/10 · treinou ontem",
    );
    expect(detalhe(concluido)).toBe("Treino concluído em 25/10 · ainda não treinou");
  });

  it("quase no fim: a data de fim e o último treino", () => {
    const fim = { list_status: "quase_no_fim" as const, current_end_date: "2026-11-03" };
    expect(detalhe({ ...fim, last_done_on: "2026-11-03", last_done_letter: "A" })).toBe(
      "Fim em 03/11 · treinou hoje",
    );
    expect(detalhe({ ...fim, last_done_on: "2026-10-27", last_done_letter: "A" })).toBe(
      "Fim em 03/11 · último treino em 27/10",
    );
    expect(detalhe(fim)).toBe("Fim em 03/11 · ainda não treinou");
  });

  it("sem treino: só o último treino", () => {
    const sem = { list_status: "sem_treino" as const };
    expect(detalhe({ ...sem, last_done_on: "2026-09-20", last_done_letter: "C" })).toBe(
      "Último treino em 20/09",
    );
    expect(detalhe({ ...sem, last_done_on: "2026-11-02", last_done_letter: "C" })).toBe(
      "Treinou ontem",
    );
    expect(detalhe(sem)).toBe("Ainda não treinou");
  });

  it("sem treino ativo e com treino agendado: quando começa", () => {
    expect(
      detalhe({
        list_status: "sem_treino",
        scheduled_start_date: "2026-11-10",
        last_done_on: "2026-09-20",
      }),
    ).toBe("Treino começa em 10/11");
  });

  it("com treino ativo e outro agendado: só o ativo", () => {
    expect(
      detalhe({
        current_end_date: "2026-12-01",
        scheduled_start_date: "2026-12-02",
        last_done_on: "2026-10-27",
        last_done_letter: "B",
      }),
    ).toBe("Último treino em 27/10 · Ficha B");
  });
});

describe("pedido de treino (regras 62 e 103)", () => {
  it("a linha marca o pedido aberto que a view calcula", () => {
    const linha = (has_open_request: boolean) =>
      linhaDoAluno(aluno({ student_id: "a1", name: "Ana", has_open_request }), HOJE);
    expect(linha(true).pediuTreino).toBe(true);
    expect(linha(false).pediuTreino).toBe(false);
  });
});

describe("montarLista (regra 59)", () => {
  it("em ordem alfabética pt-BR, com a data de envio de cada convite", () => {
    const linhas = montarLista(
      [
        aluno({ student_id: "a1", name: "Vinicius Alves", current_end_date: "2026-12-01" }),
        aluno({
          student_id: "a2",
          name: "Rafael Torres",
          list_status: "convite_pendente",
          invite_id: "c1",
          invite_expires_at: "2026-11-03T12:00:00-03:00",
        }),
        aluno({ student_id: "a3", name: "Érica Lima", list_status: "sem_treino" }),
      ],
      [{ id: "c1", created_at: "2026-10-27T12:00:00-03:00" }],
      HOJE,
    );
    expect(linhas.map((l) => [l.nome, l.detalhe])).toEqual([
      ["Érica Lima", "Ainda não treinou"],
      ["Rafael Torres", "Convite enviado em 27/10 · vale até 03/11"],
      ["Vinicius Alves", "Ainda não treinou"],
    ]);
  });
});

describe("resumoDaLista (regra 147 (2))", () => {
  const linhas = montarLista(
    [
      aluno({ student_id: "a1", name: "Ana Lima", has_open_request: true }),
      aluno({ student_id: "a2", name: "Bruno", has_open_request: true }),
      aluno({ student_id: "a3", name: "Carla", list_status: "convite_pendente" }),
    ],
    [],
    HOJE,
  );

  it("conta todos os alunos, com convite inclusive, no singular e no plural", () => {
    expect(resumoDaLista(linhas.slice(2))).toBe("1 aluno");
    expect(resumoDaLista(linhas.map((l) => ({ ...l, pediuTreino: false })))).toBe("3 alunos");
  });

  it("o trecho do pedido só aparece se houver, no singular e no plural", () => {
    expect(resumoDaLista(linhas)).toBe("3 alunos · 2 pediram novo treino");
    expect(resumoDaLista(linhas.slice(1))).toBe("2 alunos · 1 pediu novo treino");
  });

  it("na busca, conta só os resultados", () => {
    expect(resumoDaLista(linhas, "ana")).toBe("1 resultado");
    expect(resumoDaLista(linhas, "zé")).toBe("0 resultados");
  });
});
