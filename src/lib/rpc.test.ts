import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock simples (sem vi.fn na resposta): o vi.fn acompanha a promessa devolvida e marca a
// rejeição como "não tratada", mesmo quando o código trata.
const falso = vi.hoisted(() => ({
  chamadas: [] as unknown[][],
  responder: (): Promise<unknown> => Promise.resolve({ data: null, error: null }),
}));
vi.mock("./supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => {
      falso.chamadas.push(args);
      return falso.responder();
    },
  },
}));

const { rpc, ErroApp } = await import("./rpc");

async function capturar(promessa: Promise<unknown>) {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroApp);
  return erro as InstanceType<typeof ErroApp>;
}

describe("rpc", () => {
  beforeEach(() => {
    falso.chamadas = [];
    falso.responder = () => Promise.resolve({ data: null, error: null });
  });

  it("passa nome e argumentos e devolve o retorno", async () => {
    falso.responder = () => Promise.resolve({ data: { ok: true }, error: null });
    await expect(rpc("get_invite_preview", { p_token: "abc" })).resolves.toEqual({ ok: true });
    expect(falso.chamadas).toEqual([["get_invite_preview", { p_token: "abc" }]]);
  });

  it("chama função sem argumento sem objeto", async () => {
    await rpc("cancel_training_request");
    expect(falso.chamadas).toEqual([["cancel_training_request", undefined]]);
  });

  it("lança ErroApp com o código do banco", async () => {
    falso.responder = () =>
      Promise.resolve({ data: null, error: { code: "P0001", message: "request_already_open" } });
    const erro = await capturar(rpc("request_new_workout"));
    expect(erro.codigo).toBe("request_already_open");
    expect(erro.message).toBe("Você já pediu um treino novo.");
  });

  it("transforma falha de rede em sem_conexao", async () => {
    falso.responder = () => Promise.reject(new TypeError("Failed to fetch"));
    const erro = await capturar(rpc("cancel_training_request"));
    expect(erro.codigo).toBe("sem_conexao");
  });
});
