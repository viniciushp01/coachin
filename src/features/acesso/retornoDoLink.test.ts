import { describe, expect, it } from "vitest";
import { situacaoDoLink } from "./retornoDoLink";

const HORA = 60 * 60 * 1000;
const agora = Date.UTC(2026, 9, 28, 12, 0);
const erroDoSupabase =
  "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

describe("situacaoDoLink (regras 88 e 100)", () => {
  it("link válido: o Supabase abriu a sessão de recuperação", () => {
    expect(situacaoDoLink({ hash: "", pedidoEm: agora - HORA, agora, temSessao: true })).toBe(
      "valido",
    );
  });

  it("erro com mais de 1 dia desde o pedido: expirou", () => {
    expect(
      situacaoDoLink({
        hash: erroDoSupabase,
        pedidoEm: agora - 25 * HORA,
        agora,
        temSessao: false,
      }),
    ).toBe("expirado");
  });

  it("erro dentro de 1 dia: já usado ou substituído por um reenvio", () => {
    expect(
      situacaoDoLink({ hash: erroDoSupabase, pedidoEm: agora - 2 * HORA, agora, temSessao: false }),
    ).toBe("nao_vale_mais");
  });

  it('erro sem a hora do pedido: não dá para saber se venceu, vale o "não vale mais"', () => {
    expect(situacaoDoLink({ hash: erroDoSupabase, agora, temSessao: false })).toBe("nao_vale_mais");
  });

  it("erro no link vence uma sessão que já existia no aparelho", () => {
    expect(
      situacaoDoLink({ hash: erroDoSupabase, pedidoEm: agora - 2 * HORA, agora, temSessao: true }),
    ).toBe("nao_vale_mais");
  });

  it("sem erro e sem sessão (tela aberta sem link): não vale", () => {
    expect(situacaoDoLink({ hash: "", agora, temSessao: false })).toBe("nao_vale_mais");
  });
});
