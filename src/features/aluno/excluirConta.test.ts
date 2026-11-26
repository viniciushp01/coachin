import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";

const rpc = vi.hoisted(() => vi.fn<(f: string) => Promise<unknown>>());
const sair = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("@/lib/rpc", () => ({ rpc }));
vi.mock("@/lib/sessao", () => ({ sair }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/features/acompanhar/dados", () => ({}));
vi.mock("@/lib/vinculo", () => ({}));
vi.mock("./dados", () => ({}));

import { excluirMinhaConta } from "./dadosAbas";

beforeEach(() => {
  rpc.mockReset();
  sair.mockClear();
});

describe("excluir minha conta (regra 120)", () => {
  it("chama delete_my_account e só depois encerra a sessão", async () => {
    const ordem: string[] = [];
    rpc.mockImplementation(() => {
      ordem.push("rpc");
      return Promise.resolve();
    });
    sair.mockImplementation(() => {
      ordem.push("sair");
      return Promise.resolve();
    });
    await excluirMinhaConta();
    expect(rpc).toHaveBeenCalledWith("delete_my_account");
    expect(ordem).toEqual(["rpc", "sair"]);
  });

  it("sem conexão: o erro sobe e a sessão continua (nada foi alterado, regra 116)", async () => {
    rpc.mockRejectedValue(new ErroApp("sem_conexao"));
    await expect(excluirMinhaConta()).rejects.toMatchObject({ codigo: "sem_conexao" });
    expect(sair).not.toHaveBeenCalled();
  });

  it("o banco recusa: o erro sobe e a sessão continua", async () => {
    rpc.mockRejectedValue(new ErroApp("forbidden"));
    await expect(excluirMinhaConta()).rejects.toMatchObject({ codigo: "forbidden" });
    expect(sair).not.toHaveBeenCalled();
  });
});
