// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { urlDeVoltaDaConfirmacao } from "@/features/acesso/linkDeConfirmacao";
import { destinoDaRaiz, type EstadoSessao } from "@/lib/destino";
import { apagarConviteGuardado, guardarConvite, lerConviteGuardado } from "./conviteGuardado";
import { conviteDaBusca, guardarConviteDaBusca } from "./conviteNaUrl";

const aluno: EstadoSessao = {
  tipo: "logado",
  papel: "aluno",
  bloqueado: false,
  nome: "Ana",
  email: "ana@exemplo.com",
  temProfessor: false,
  avisoAceito: false,
  perfilConcluido: false,
};

beforeEach(() => localStorage.clear());

describe("convite sobrevive à confirmação em outro navegador (regra 172)", () => {
  it("confirma em outro contexto, entra e cai no convite, não em /sem-professor", () => {
    // Contexto A: o aluno abriu o convite e criou a conta; o link de volta leva o token.
    guardarConvite("abc23xyz");
    const volta = new URL(urlDeVoltaDaConfirmacao(1_800_000_000_000));
    // Contexto B (outro navegador/app): sem localStorage; só o endereço chega.
    localStorage.clear();
    expect(lerConviteGuardado()).toBeNull();
    const busca = Object.fromEntries(volta.searchParams);
    // /confirmar-email repassa para /entrar, que guarda de novo.
    guardarConviteDaBusca({ convite: conviteDaBusca(busca) });
    expect(destinoDaRaiz(aluno, lerConviteGuardado())).toEqual({
      to: "/convite/$token",
      params: { token: "abc23xyz" },
    });
  });
});

describe("conviteDaBusca", () => {
  it("aceita token com letras minúsculas e dígitos", () => {
    expect(conviteDaBusca({ convite: "abc23xyz" })).toBe("abc23xyz");
    expect(conviteDaBusca({ convite: "a".repeat(64) })).toBe("a".repeat(64));
  });

  it.each([undefined, "", "ABC", "a b", "a/../b", "<x>", 123, "a".repeat(129)])(
    "ignora token inválido (%s)",
    (valor) => {
      expect(conviteDaBusca({ convite: valor })).toBeUndefined();
    },
  );
});

describe("guardarConviteDaBusca", () => {
  it("guarda o token válido", () => {
    guardarConviteDaBusca({ convite: "abc23xyz" });
    expect(lerConviteGuardado()).toBe("abc23xyz");
  });

  it("sem token, não mexe no que já estava guardado", () => {
    guardarConvite("antigo2");
    guardarConviteDaBusca({});
    expect(lerConviteGuardado()).toBe("antigo2");
    apagarConviteGuardado();
  });
});
