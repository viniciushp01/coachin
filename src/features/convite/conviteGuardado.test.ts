// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { apagarConviteGuardado, guardarConvite, lerConviteGuardado } from "./conviteGuardado";

const DIA = 24 * 60 * 60 * 1000;

afterEach(() => localStorage.clear());

describe("convite guardado no aparelho", () => {
  it("guarda o token para voltar ao convite depois do login", () => {
    guardarConvite("tok-1", 1000);
    expect(lerConviteGuardado(1000 + DIA)).toBe("tok-1");
  });

  it("o mais recente substitui o anterior", () => {
    guardarConvite("tok-1", 1000);
    guardarConvite("tok-2", 2000);
    expect(lerConviteGuardado(3000)).toBe("tok-2");
  });

  it("some depois de 7 dias, a validade do convite de aluno", () => {
    guardarConvite("tok-1", 1000);
    expect(lerConviteGuardado(1000 + 7 * DIA + 1)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("apagar remove o token", () => {
    guardarConvite("tok-1", 1000);
    apagarConviteGuardado();
    expect(lerConviteGuardado(2000)).toBeNull();
  });

  it("valor corrompido é ignorado", () => {
    localStorage.setItem("coachin.convite", "{lixo");
    expect(lerConviteGuardado(1000)).toBeNull();
  });
});
