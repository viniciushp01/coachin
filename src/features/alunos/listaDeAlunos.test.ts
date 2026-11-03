import { describe, expect, it } from "vitest";
import {
  CHIP_DO_ALUNO,
  linhaDoAluno,
  montarLista,
  resumoDaLista,
  type AlunoDaLista,
} from "./listaDeAlunos";

function aluno(a: Partial<AlunoDaLista> & Pick<AlunoDaLista, "student_id" | "name">) {
  return {
    list_status: "ativo",
    invite_id: null,
    invite_expires_at: null,
    invite_declined_at: null,
    ...a,
  } as AlunoDaLista;
}

describe("linhaDoAluno (regras 55, 102, 122 e 147)", () => {
  it("vinculado (ativo, sem treino, quase no fim): só nome e chip, sem detalhe e sem abrir", () => {
    for (const status of ["ativo", "sem_treino", "quase_no_fim"] as const) {
      const linha = linhaDoAluno(aluno({ student_id: "a1", name: "Ana", list_status: status }));
      expect(linha).toEqual({ id: "a1", nome: "Ana", status, detalhe: undefined, abre: false });
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
      "2026-10-27T12:00:00-03:00",
    );
    expect(linha).toMatchObject({
      status: "convite_pendente",
      detalhe: "Convite enviado em 27/10 · vale até 03/11",
      abre: true,
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
      "2026-10-17T12:00:00-03:00",
    );
    expect(linha).toMatchObject({ detalhe: "Convite expirou em 24/10", abre: true });
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
    expect(linhaDoAluno(recusado)).toMatchObject({
      detalhe: "Recusou o convite em 27/10",
      abre: true,
    });
    expect(linhaDoAluno({ ...recusado, invite_declined_at: null }).detalhe).toBe(
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

describe("montarLista (regra 59)", () => {
  it("em ordem alfabética pt-BR, com a data de envio de cada convite", () => {
    const linhas = montarLista(
      [
        aluno({ student_id: "a1", name: "Vinicius Alves" }),
        aluno({
          student_id: "a2",
          name: "Rafael Torres",
          list_status: "convite_pendente",
          invite_id: "c1",
          invite_expires_at: "2026-11-03T12:00:00-03:00",
        }),
        aluno({ student_id: "a3", name: "Érica Lima", list_status: "sem_treino" }),
        aluno({ student_id: "a4", name: "carla Mendes", list_status: "quase_no_fim" }),
      ],
      [{ id: "c1", created_at: "2026-10-27T12:00:00-03:00" }],
    );
    expect(linhas.map((l) => [l.nome, l.detalhe])).toEqual([
      ["carla Mendes", undefined],
      ["Érica Lima", undefined],
      ["Rafael Torres", "Convite enviado em 27/10 · vale até 03/11"],
      ["Vinicius Alves", undefined],
    ]);
  });
});

describe("resumoDaLista (regra 147)", () => {
  const linhas = montarLista(
    [aluno({ student_id: "a1", name: "Ana Lima" }), aluno({ student_id: "a2", name: "Bruno" })],
    [],
  );

  it("conta todos os alunos, no singular e no plural", () => {
    expect(resumoDaLista(linhas)).toBe("2 alunos");
    expect(resumoDaLista(linhas.slice(0, 1))).toBe("1 aluno");
  });

  it("na busca, conta os resultados", () => {
    expect(resumoDaLista(linhas, "ana")).toBe("1 resultado");
    expect(resumoDaLista(linhas, "zé")).toBe("0 resultados");
  });
});
