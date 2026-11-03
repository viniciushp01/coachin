// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { lerUltimoUso, registrarUso, sessaoVencida } from "./inatividade";

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;
const agora = Date.UTC(2026, 9, 28, 12, 0);

describe("sessaoVencida (regra 121: 30 dias sem uso)", () => {
  it("uso recente continua valendo", () => {
    expect(sessaoVencida(agora - 7 * DIA, agora)).toBe(false);
    expect(sessaoVencida(agora - (30 * DIA - 60 * MINUTO), agora)).toBe(false);
  });

  it("vence depois de 30 dias sem uso", () => {
    expect(sessaoVencida(agora - (30 * DIA + MINUTO), agora)).toBe(true);
    expect(sessaoVencida(agora - 90 * DIA, agora)).toBe(true);
  });

  it("sem registro de uso (primeira abertura neste aparelho), não vence", () => {
    expect(sessaoVencida(null, agora)).toBe(false);
  });
});

describe("último uso guardado no aparelho", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("registra e lê o momento do último uso", () => {
    registrarUso(agora);
    expect(lerUltimoUso()).toBe(agora);
  });

  it("valor estranho no aparelho conta como sem registro", () => {
    localStorage.setItem("coachin:ultimo-uso", "abc");
    expect(lerUltimoUso()).toBeNull();
  });

  it("aparelho sem acesso ao armazenamento não quebra o app", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => registrarUso(agora)).not.toThrow();
    expect(lerUltimoUso()).toBeNull();
  });

  it("não apaga outros dados guardados no aparelho", () => {
    localStorage.setItem("coachin:outra-coisa", "fica");
    registrarUso(agora);
    expect(localStorage.getItem("coachin:outra-coisa")).toBe("fica");
  });
});
