import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";

const chamadas: unknown[][] = [];
let entrar: () => Promise<{ error: unknown }> = () => Promise.resolve({ error: null });
let funcao: () => Promise<unknown> = () => Promise.resolve({ ok: true, email: "carlos@email.com" });
vi.mock("@/lib/funcoes", () => ({
  chamarFuncao: (...args: unknown[]) => {
    chamadas.push(["funcao", ...args]);
    return funcao();
  },
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => {
        chamadas.push(["entrar", ...args]);
        return entrar();
      },
    },
  },
}));

const { ativarAcessoDeProfessor } = await import("./ativarAcesso");

describe("ativarAcessoDeProfessor", () => {
  beforeEach(() => {
    chamadas.length = 0;
    entrar = () => Promise.resolve({ error: null });
    funcao = () => Promise.resolve({ ok: true, email: "carlos@email.com" });
  });

  it("ativa pela Edge Function e entra com e-mail e senha", async () => {
    await ativarAcessoDeProfessor("tok-1", "carlos@email.com", "senha123");
    expect(chamadas).toEqual([
      ["funcao", "ativar-professor", { token: "tok-1", senha: "senha123" }],
      ["entrar", { email: "carlos@email.com", password: "senha123" }],
    ]);
  });

  it("erro da função não tenta entrar", async () => {
    funcao = () => Promise.reject(new ErroApp("invite_replaced"));
    await expect(ativarAcessoDeProfessor("t", "a@b.com", "senha123")).rejects.toMatchObject({
      codigo: "invite_replaced",
    });
    expect(chamadas).toHaveLength(1);
  });

  it("falha ao entrar depois de ativar vira ErroApp traduzido", async () => {
    entrar = () => Promise.resolve({ error: { status: 0, message: "Failed to fetch" } });
    await expect(ativarAcessoDeProfessor("t", "a@b.com", "senha123")).rejects.toMatchObject({
      codigo: "sem_conexao",
    });
  });

  it("entra com o e-mail que a função devolve (o do convite)", async () => {
    await ativarAcessoDeProfessor("tok-1", "", "senha123");
    expect(chamadas[1]).toEqual(["entrar", { email: "carlos@email.com", password: "senha123" }]);
  });

  it("convite já usado: se a senha entra, a ativação anterior deu certo (resposta perdida)", async () => {
    funcao = () => Promise.reject(new ErroApp("invite_used"));
    await ativarAcessoDeProfessor("t", "a@b.com", "senha123");
    expect(chamadas[1]).toEqual(["entrar", { email: "a@b.com", password: "senha123" }]);
  });

  it("convite já usado e a senha não entra: mantém invite_used", async () => {
    funcao = () => Promise.reject(new ErroApp("invite_used"));
    entrar = () => Promise.resolve({ error: { code: "invalid_credentials" } });
    await expect(ativarAcessoDeProfessor("t", "a@b.com", "senha123")).rejects.toMatchObject({
      codigo: "invite_used",
    });
  });
});
