import { describe, expect, it } from "vitest";
import { ErroApp, MENSAGENS, erroDaResposta, erroDeAuth } from "./erros";

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

// Edge Functions: códigos em `falha("codigo", …)` e `{ error: "codigo" }`.
const funcoes = import.meta.glob<string>(["/supabase/functions/**/*.ts", "!**/*_test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const codigosDasFuncoes = [
  ...new Set(
    Object.values(funcoes).flatMap((ts) =>
      [...ts.matchAll(/(?:falha\(|error: )"([a-z_]+)"/g)].map((m) => m[1]),
    ),
  ),
].sort();

describe("tradução dos códigos de erro do banco", () => {
  it("lê os códigos das migrations", () => {
    expect(Object.keys(migrations).length).toBeGreaterThan(0);
    expect(codigosDoBanco.length).toBeGreaterThan(50);
  });

  it("tem mensagem em pt-BR para todo código devolvido pelas Edge Functions", () => {
    expect(codigosDasFuncoes).toContain("email_has_account");
    const semTraducao = codigosDasFuncoes.filter((c) => !Object.hasOwn(MENSAGENS, c!));
    expect(semTraducao, "Acrescente estes códigos em src/lib/erros.ts").toEqual([]);
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

describe("erroDeAuth", () => {
  it("traduz login com e-mail ou senha errados", () => {
    const erro = erroDeAuth({
      code: "invalid_credentials",
      status: 400,
      message: "Invalid login credentials",
    });
    expect(erro.codigo).toBe("invalid_credentials");
    expect(erro.message).toBe("E-mail ou senha não conferem.");
  });

  it("não confunde e-mail não confirmado com senha errada", () => {
    const erro = erroDeAuth({
      code: "email_not_confirmed",
      status: 400,
      message: "Email not confirmed",
    });
    expect(erro.codigo).toBe("email_not_confirmed");
  });

  it("traduz e-mail já cadastrado e senha fraca", () => {
    expect(erroDeAuth({ code: "user_already_exists", status: 422 }).codigo).toBe(
      "user_already_exists",
    );
    expect(erroDeAuth({ code: "email_exists", status: 422 }).codigo).toBe("user_already_exists");
    expect(erroDeAuth({ code: "weak_password", status: 422 }).codigo).toBe("weak_password");
  });

  it("traduz senha igual à atual", () => {
    expect(erroDeAuth({ code: "same_password", status: 422 }).codigo).toBe("same_password");
  });

  it("traduz limite de envios", () => {
    expect(erroDeAuth({ code: "over_email_send_rate_limit", status: 429 }).codigo).toBe(
      "too_many_emails",
    );
    expect(erroDeAuth({ code: "over_request_rate_limit", status: 429 }).codigo).toBe(
      "too_many_requests",
    );
    expect(erroDeAuth({ status: 429 }).codigo).toBe("too_many_requests");
  });

  it("reconhece falta de conexão e cai no genérico para o resto", () => {
    expect(erroDeAuth({ status: 0, message: "Failed to fetch" }).codigo).toBe("sem_conexao");
    expect(erroDeAuth({ code: "unexpected_failure", status: 500 }).codigo).toBe(
      "erro_desconhecido",
    );
  });
});
