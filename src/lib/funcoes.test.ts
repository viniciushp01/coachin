import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

// Mock simples (sem vi.fn na resposta), como em rpc.test.ts.
const falso = vi.hoisted(() => ({
  chamadas: [] as unknown[][],
  responder: (): Promise<unknown> => Promise.resolve({ data: null, error: null }),
}));
vi.mock("./supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => {
        falso.chamadas.push(args);
        return falso.responder();
      },
    },
  },
}));

const { chamarFuncao } = await import("./funcoes");
const { ErroApp } = await import("./erros");

async function capturar(promessa: Promise<unknown>) {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroApp);
  return erro as InstanceType<typeof ErroApp>;
}

function respostaHttp(status: number, corpo: string) {
  return new FunctionsHttpError(new Response(corpo, { status }));
}

describe("chamarFuncao", () => {
  beforeEach(() => {
    falso.chamadas = [];
    falso.responder = () => Promise.resolve({ data: null, error: null });
  });

  it("manda o corpo por POST e devolve a resposta", async () => {
    falso.responder = () => Promise.resolve({ data: { ok: true }, error: null });
    await expect(chamarFuncao("ativar-professor", { token: "t" })).resolves.toEqual({ ok: true });
    expect(falso.chamadas).toEqual([["ativar-professor", { body: { token: "t" } }]]);
  });

  it("traduz o código de erro que a função devolve", async () => {
    falso.responder = () =>
      Promise.resolve({ data: null, error: respostaHttp(409, '{"error":"invite_used"}') });
    const erro = await capturar(chamarFuncao("ativar-professor", {}));
    expect(erro.codigo).toBe("invite_used");
    expect(erro.message).toBe("Este convite já foi usado.");
  });

  it("código desconhecido ou corpo ilegível vira erro_desconhecido", async () => {
    for (const corpo of ['{"error":"nao_existe"}', "<html>", "{}"]) {
      falso.responder = () => Promise.resolve({ data: null, error: respostaHttp(500, corpo) });
      expect((await capturar(chamarFuncao("x", {}))).codigo).toBe("erro_desconhecido");
    }
  });

  it("falha de rede vira sem_conexao", async () => {
    falso.responder = () =>
      Promise.resolve({ data: null, error: new FunctionsFetchError(new TypeError("x")) });
    expect((await capturar(chamarFuncao("x", {}))).codigo).toBe("sem_conexao");
    falso.responder = () => Promise.reject(new TypeError("Failed to fetch"));
    expect((await capturar(chamarFuncao("x", {}))).codigo).toBe("sem_conexao");
  });
});
