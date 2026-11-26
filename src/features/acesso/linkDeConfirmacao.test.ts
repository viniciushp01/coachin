// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardarConvite } from "@/features/convite/conviteGuardado";
import {
  confirmarEmailPeloToque,
  decidirVoltaDoLink,
  resolverLinkDeConfirmacao,
  urlDeVoltaDaConfirmacao,
} from "./linkDeConfirmacao";

const getSession = vi.fn();
const signOut = vi.fn();
const verifyOtp = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signOut: (...args: unknown[]) => signOut(...args),
      verifyOtp: (...args: unknown[]) => verifyOtp(...args),
    },
  },
}));

const HORA = 60 * 60 * 1000;
const agora = Date.UTC(2026, 9, 28, 12, 0);
const erroDoSupabase = "#error=access_denied&error_code=otp_expired";
const sessaoDoLink = { data: { session: { user: { email: "ana@exemplo.com" } } } };

beforeEach(() => {
  getSession.mockReset().mockResolvedValue({ data: { session: null } });
  signOut.mockReset().mockResolvedValue({ error: null });
  verifyOtp.mockReset();
});

describe("decidirVoltaDoLink (regra 176)", () => {
  it("com token_hash, só pede o toque: não fala com o Supabase nem mexe em sessão", async () => {
    const resultado = await decidirVoltaDoLink({
      tokenHash: "abc",
      hash: "",
      pedidoEm: agora - HORA,
      agora,
    });

    expect(resultado).toEqual({ tipo: "confirmar", tokenHash: "abc" });
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("abrir o mesmo link duas vezes não gasta o token", async () => {
    await decidirVoltaDoLink({ tokenHash: "abc", hash: "", agora });
    await decidirVoltaDoLink({ tokenHash: "abc", hash: "", agora });

    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("link antigo (sem token_hash) segue o fluxo anterior da regra 128", async () => {
    getSession.mockResolvedValue(sessaoDoLink);

    const resultado = await decidirVoltaDoLink({ hash: "", pedidoEm: agora - HORA, agora });

    expect(resultado).toEqual({ tipo: "confirmado", email: "ana@exemplo.com" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});

describe("confirmarEmailPeloToque (regra 176)", () => {
  it("chama verifyOtp uma vez, encerra a sessão local e manda ao Login com o e-mail", async () => {
    verifyOtp.mockResolvedValue({
      data: { user: { email: "ana@exemplo.com" }, session: {} },
      error: null,
    });

    const resultado = await confirmarEmailPeloToque({ tokenHash: "abc", agora });

    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "abc" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(resultado).toEqual({ tipo: "confirmado", email: "ana@exemplo.com" });
  });

  it('token gasto, pedido com mais de 1 dia: "Este link expirou"', async () => {
    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "otp_expired", status: 403, message: "Token has expired or is invalid" },
    });

    const resultado = await confirmarEmailPeloToque({
      tokenHash: "abc",
      pedidoEm: agora - 25 * HORA,
      agora,
    });

    expect(resultado).toEqual({ tipo: "tela", situacao: "expirado" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('token já usado: "Este link não vale mais"', async () => {
    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "otp_expired", status: 403, message: "Token has expired or is invalid" },
    });

    const resultado = await confirmarEmailPeloToque({
      tokenHash: "abc",
      pedidoEm: agora - 2 * HORA,
      agora,
    });

    expect(resultado).toEqual({ tipo: "tela", situacao: "nao_vale_mais" });
  });

  it("sem conexão: não troca de tela, o erro sobe para o toast (o token não foi gasto)", async () => {
    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { status: 0, message: "Failed to fetch" },
    });

    await expect(confirmarEmailPeloToque({ tokenHash: "abc", agora })).rejects.toMatchObject({
      codigo: "sem_conexao",
    });
  });
});

describe("urlDeVoltaDaConfirmacao", () => {
  beforeEach(() => localStorage.clear());

  it("com convite guardado, leva o token no endereço (regra 172)", () => {
    guardarConvite("abc23xyz");
    expect(urlDeVoltaDaConfirmacao(1_800_000_000_000)).toBe(
      `${window.location.origin}/confirmar-email?pedido=1800000000000&convite=abc23xyz`,
    );
  });

  it("volta para a tela do link com a hora do pedido", () => {
    expect(urlDeVoltaDaConfirmacao(1_800_000_000_000)).toBe(
      `${window.location.origin}/confirmar-email?pedido=1800000000000`,
    );
  });
});

describe("resolverLinkDeConfirmacao (regra 128)", () => {
  it("válido: encerra a sessão que o link abriu e manda ao Login com o e-mail", async () => {
    getSession.mockResolvedValue(sessaoDoLink);

    const resultado = await resolverLinkDeConfirmacao({ hash: "", pedidoEm: agora - HORA, agora });

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(resultado).toEqual({ tipo: "confirmado", email: "ana@exemplo.com" });
  });

  it('vencido (mais de 1 dia): "Este link expirou", sem mexer em sessão', async () => {
    const resultado = await resolverLinkDeConfirmacao({
      hash: erroDoSupabase,
      pedidoEm: agora - 25 * HORA,
      agora,
    });

    expect(resultado).toEqual({ tipo: "tela", situacao: "expirado" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('já usado ou substituído: "Este link não vale mais"', async () => {
    const resultado = await resolverLinkDeConfirmacao({
      hash: erroDoSupabase,
      pedidoEm: agora - 2 * HORA,
      agora,
    });

    expect(resultado).toEqual({ tipo: "tela", situacao: "nao_vale_mais" });
  });
});
