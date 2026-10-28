import { describe, expect, it } from "vitest";
import { email, senhaDoLogin, senhaNova } from "./formularios";

function erroDe(resultado: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultado.success ? undefined : resultado.error?.issues[0]?.message;
}

describe("email", () => {
  it("aceita e-mail válido, sem espaços nas pontas", () => {
    expect(email.parse("  ana@exemplo.com ")).toBe("ana@exemplo.com");
    expect(email.safeParse("nome.sobrenome+treino@academia.com.br").success).toBe(true);
  });

  it("recusa e-mail vazio ou mal formado com a mensagem de produto", () => {
    for (const valor of ["", "ana", "ana@", "ana@exemplo", "ana exemplo@x.com"]) {
      expect(erroDe(email.safeParse(valor))).toBe(
        "Digite um e-mail válido, como nome@exemplo.com.",
      );
    }
  });
});

describe("senhaNova (regra 78)", () => {
  it("aceita 8 ou mais caracteres com letras e números", () => {
    expect(senhaNova.safeParse("abc12345").success).toBe(true);
    expect(senhaNova.safeParse("Treino de perna 2").success).toBe(true);
  });

  it("recusa senha curta, só letras ou só números", () => {
    for (const valor of ["", "abc1234", "abcdefgh", "12345678"]) {
      expect(erroDe(senhaNova.safeParse(valor))).toBe(
        "A senha precisa ter pelo menos 8 caracteres, com letras e números.",
      );
    }
  });
});

describe("senhaDoLogin", () => {
  it("não valida força, só exige a senha", () => {
    expect(senhaDoLogin.safeParse("abc").success).toBe(true);
    expect(erroDe(senhaDoLogin.safeParse(""))).toBe("Digite sua senha.");
  });
});
