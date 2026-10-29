import { describe, expect, it } from "vitest";
import {
  buscarPorNome,
  montarLista,
  resumoDaLista,
  type ConviteDeProfessor,
  type PerfilDeProfessor,
} from "./listaDeProfessores";

const agora = new Date("2026-10-29T12:00:00-03:00");

function perfil(p: Partial<PerfilDeProfessor> & Pick<PerfilDeProfessor, "id" | "full_name">) {
  return {
    email: `${p.id}@exemplo.com`,
    status: "active",
    created_at: "2026-09-01T12:00:00-03:00",
    ...p,
  } as PerfilDeProfessor;
}

function convite(c: Partial<ConviteDeProfessor> & Pick<ConviteDeProfessor, "id" | "email">) {
  return {
    invitee_name: null,
    status: "pending",
    created_at: "2026-10-28T12:00:00-03:00",
    expires_at: "2026-10-29T18:00:00-03:00",
    declined_at: null,
    accepted_at: null,
    accepted_by: null,
    ...c,
  } as ConviteDeProfessor;
}

describe("montarLista (regras 92 e 102)", () => {
  it("junta professores e convites nos cinco estados, em ordem alfabética", () => {
    const linhas = montarLista(
      [
        perfil({ id: "p1", full_name: "Carlos Almeida" }),
        perfil({ id: "p2", full_name: "Marina Prado", status: "blocked" }),
      ],
      [
        convite({ id: "c1", email: "fernanda@exemplo.com", invitee_name: "Fernanda Lopes" }),
        convite({
          id: "c2",
          email: "ricardo@exemplo.com",
          invitee_name: "Ricardo Souza",
          expires_at: "2026-10-25T12:00:00-03:00",
        }),
        convite({
          id: "c3",
          email: "bruno@exemplo.com",
          invitee_name: "Bruno Dias",
          status: "declined",
          declined_at: "2026-10-27T12:00:00-03:00",
        }),
      ],
      agora,
    );
    expect(linhas.map((l) => [l.nome, l.estado, l.detalhe])).toEqual([
      ["Bruno Dias", "recusado", "Recusou o convite em 27/10"],
      ["Carlos Almeida", "ativo", "Professor desde 01/09"],
      ["Fernanda Lopes", "pendente", "Convite válido até 29/10"],
      ["Marina Prado", "bloqueado", "Acesso bloqueado"],
      ["Ricardo Souza", "expirado", "Convite expirou em 25/10"],
    ]);
  });

  it("professor desde: a data do aceite do convite, quando há", () => {
    const [linha] = montarLista(
      [perfil({ id: "p1", full_name: "Carlos Almeida", email: "carlos@exemplo.com" })],
      [
        convite({
          id: "c1",
          email: "carlos@exemplo.com",
          status: "accepted",
          accepted_by: "p1",
          accepted_at: "2026-09-03T12:00:00-03:00",
        }),
      ],
      agora,
    );
    expect(linha).toMatchObject({ estado: "ativo", detalhe: "Professor desde 03/09" });
  });

  it("um e-mail aparece uma vez: vale o convite mais recente; quem já é professor não repete", () => {
    const linhas = montarLista(
      [perfil({ id: "p1", full_name: "Carlos Almeida", email: "carlos@exemplo.com" })],
      [
        convite({ id: "novo", email: "ana@exemplo.com", created_at: "2026-10-28T12:00:00-03:00" }),
        convite({
          id: "velho",
          email: "ana@exemplo.com",
          status: "replaced",
          created_at: "2026-10-20T12:00:00-03:00",
        }),
        convite({ id: "c3", email: "carlos@exemplo.com" }),
        convite({ id: "usado", email: "saiu@exemplo.com", status: "accepted" }),
      ],
      agora,
    );
    expect(linhas.map((l) => l.id)).toEqual(["novo", "p1"]);
  });

  it("convite sem nome mostra o e-mail", () => {
    const [linha] = montarLista([], [convite({ id: "c1", email: "x@exemplo.com" })], agora);
    expect(linha?.nome).toBe("x@exemplo.com");
  });
});

describe("buscarPorNome", () => {
  const linhas = montarLista(
    [
      perfil({ id: "p1", full_name: "Carlos Almeida" }),
      perfil({ id: "p2", full_name: "Márcia Lopes" }),
    ],
    [],
    agora,
  );

  it("ignora maiúsculas, acentos e espaços nas pontas", () => {
    expect(buscarPorNome(linhas, " marcia ").map((l) => l.nome)).toEqual(["Márcia Lopes"]);
    expect(buscarPorNome(linhas, "ALM").map((l) => l.nome)).toEqual(["Carlos Almeida"]);
  });

  it("busca vazia devolve todos", () => {
    expect(buscarPorNome(linhas, "  ")).toHaveLength(2);
  });
});

describe("resumoDaLista", () => {
  const linhas = montarLista(
    [perfil({ id: "p1", full_name: "Carlos Almeida" })],
    [convite({ id: "c1", email: "f@exemplo.com", invitee_name: "Fernanda Lopes" })],
    agora,
  );

  it("conta professores e convites pendentes", () => {
    expect(resumoDaLista(linhas)).toBe("2 professores · 1 convite pendente");
    expect(resumoDaLista(linhas.slice(0, 1))).toBe("1 professor");
  });

  it("na busca, conta os resultados", () => {
    expect(resumoDaLista(linhas, "car")).toBe("1 resultado");
    expect(resumoDaLista(linhas, "zé")).toBe("0 resultados");
  });
});
