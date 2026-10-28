import { describe, expect, it } from "vitest";
import { ErroApp, MENSAGENS, erroDaResposta } from "./erros";

const migrations = import.meta.glob<string>("/supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

const codigosDoBanco = [
  ...new Set(
    Object.values(migrations).flatMap((sql) =>
      [...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]),
    ),
  ),
].sort();

describe("tradução dos códigos de erro do banco", () => {
  it("lê os códigos das migrations", () => {
    expect(Object.keys(migrations).length).toBeGreaterThan(0);
    expect(codigosDoBanco.length).toBeGreaterThan(50);
  });

  it("tem mensagem em pt-BR para todo código lançado pelo banco", () => {
    const semTraducao = codigosDoBanco.filter((c) => !Object.hasOwn(MENSAGENS, c!));
    expect(semTraducao, "Acrescente estes códigos em src/lib/erros.ts").toEqual([]);
  });

  it("não deixa mensagem vazia nem em inglês óbvio", () => {
    for (const [codigo, texto] of Object.entries(MENSAGENS)) {
      expect(texto.trim(), codigo).not.toBe("");
      expect(texto, codigo).not.toMatch(/\b(error|invalid|not found)\b/i);
    }
  });
});

describe("erroDaResposta", () => {
  it("traduz o código de uma exceção do banco", () => {
    const erro = erroDaResposta({ code: "P0001", message: "invite_expired" });
    expect(erro).toBeInstanceOf(ErroApp);
    expect(erro.codigo).toBe("invite_expired");
    expect(erro.message).toBe("Este convite expirou.");
  });

  it("reconhece falha de rede", () => {
    expect(erroDaResposta(new TypeError("Failed to fetch")).codigo).toBe("sem_conexao");
    expect(erroDaResposta({ message: "TypeError: Load failed" }).codigo).toBe("sem_conexao");
  });

  it("trata falta de permissão do Postgres como forbidden", () => {
    const erro = erroDaResposta({ code: "42501", message: "permission denied for function f" });
    expect(erro.codigo).toBe("forbidden");
  });

  it("cai no genérico para o resto, guardando a causa", () => {
    const original = { code: "XX000", message: "internal error" };
    const erro = erroDaResposta(original);
    expect(erro.codigo).toBe("erro_desconhecido");
    expect(erro.cause).toBe(original);
  });

  it("não embrulha de novo um ErroApp", () => {
    const erro = new ErroApp("forbidden");
    expect(erroDaResposta(erro)).toBe(erro);
  });
});
