// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolverLinkDeConfirmacao, urlDeVoltaDaConfirmacao } from "./linkDeConfirmacao";

const getSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signOut: (...args: unknown[]) => signOut(...args),
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
});

describe("urlDeVoltaDaConfirmacao", () => {
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
