import { describe, expect, it } from "vitest";
import { buscarPorNome, emOrdemAlfabetica, plural, resumoDaBusca } from "./listas";

const linhas = [{ nome: "Érica Souza" }, { nome: "ana Lima" }, { nome: "Bruno Dias" }];

describe("emOrdemAlfabetica (regra 59)", () => {
  it("ordena pelo nome em pt-BR, sem separar maiúsculas nem acentos", () => {
    expect(emOrdemAlfabetica(linhas).map((l) => l.nome)).toEqual([
      "ana Lima",
      "Bruno Dias",
      "Érica Souza",
    ]);
  });

  it("não altera a lista recebida", () => {
    const copia = [...linhas];
    emOrdemAlfabetica(linhas);
    expect(linhas).toEqual(copia);
  });
});

describe("buscarPorNome", () => {
  it("acha por parte do nome, sem acento, sem maiúsculas e sem espaços nas pontas", () => {
    expect(buscarPorNome(linhas, "  ERI ").map((l) => l.nome)).toEqual(["Érica Souza"]);
    expect(buscarPorNome(linhas, "lima").map((l) => l.nome)).toEqual(["ana Lima"]);
  });

  it("busca vazia devolve todos", () => {
    expect(buscarPorNome(linhas, "  ")).toBe(linhas);
  });
});

describe("plural e resumoDaBusca (regra 147)", () => {
  it("singular só para 1", () => {
    expect(plural(0, "aluno", "alunos")).toBe("0 alunos");
    expect(plural(1, "aluno", "alunos")).toBe("1 aluno");
    expect(plural(6, "aluno", "alunos")).toBe("6 alunos");
  });

  it("na busca, conta os resultados; fora dela, nulo", () => {
    expect(resumoDaBusca(linhas, "eri")).toBe("1 resultado");
    expect(resumoDaBusca(linhas, "xavier")).toBe("0 resultados");
    expect(resumoDaBusca(linhas, "a")).toBe("3 resultados");
    expect(resumoDaBusca(linhas, " ")).toBeNull();
  });
});
