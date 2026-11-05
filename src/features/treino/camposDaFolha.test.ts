import { describe, expect, it } from "vitest";
import {
  atalhoDoDescanso,
  camposIniciais,
  descansoEmOutro,
  trocarModo,
  type CamposDoExercicio,
} from "./camposDaFolha";

const valores = (reps: string, descanso = 0) => ({ series: 4, reps, descanso, observacao: "" });

describe("camposIniciais (regra 159 (2))", () => {
  it("exercício novo: tudo vazio, número fixo (regra 149 (4))", () => {
    expect(camposIniciais(undefined, "reps")).toEqual({
      series: "",
      modo: "fixo",
      reps: "",
      repsMax: "",
      descanso: "",
      observacao: "",
    });
  });

  it("só número → fixo", () => {
    expect(camposIniciais(valores("10"), "reps")).toMatchObject({ modo: "fixo", reps: "10" });
    expect(camposIniciais(valores("45"), "time")).toMatchObject({ modo: "fixo", reps: "45" });
  });

  it("número, hífen e número → faixa", () => {
    expect(camposIniciais(valores("8-12"), "reps")).toMatchObject({
      modo: "faixa",
      reps: "8",
      repsMax: "12",
    });
    expect(camposIniciais(valores("8 - 12"), "reps")).toMatchObject({ modo: "faixa" });
  });

  it('tempo: "30-45 s" e o "45-60" digitado antes da regra são faixa', () => {
    expect(camposIniciais(valores("30-45 s"), "time")).toMatchObject({
      modo: "faixa",
      reps: "30",
      repsMax: "45",
    });
    expect(camposIniciais(valores("45-60"), "time")).toMatchObject({
      modo: "faixa",
      reps: "45",
      repsMax: "60",
    });
  });

  it.each([
    ["Até a falha", "reps"],
    ["10 a 12", "reps"],
    ["8-12 s", "reps"],
    ["30 s", "time"],
    ["1000", "reps"],
    ["10-", "reps"],
  ] as const)("qualquer outro texto (%s) → outro formato", (reps, medida) => {
    expect(camposIniciais(valores(reps), medida)).toMatchObject({ modo: "outro", reps });
  });

  it("descanso 0 vira vazio", () => {
    expect(camposIniciais(valores("10", 0), "reps").descanso).toBe("");
    expect(camposIniciais(valores("10", 90), "reps").descanso).toBe("90");
  });
});

describe("descanso (regra 159 (4))", () => {
  it("atalho: valor igual a um dos cinco", () => {
    expect(atalhoDoDescanso("60")).toBe(60);
    expect(atalhoDoDescanso("060")).toBe(60);
    expect(atalhoDoDescanso("100")).toBeUndefined();
    expect(atalhoDoDescanso("")).toBeUndefined();
  });

  it("abre em Outro só se o valor é positivo e não bate com atalho", () => {
    expect(descansoEmOutro(100)).toBe(true);
    expect(descansoEmOutro(90)).toBe(false);
    expect(descansoEmOutro(0)).toBe(false);
  });
});

describe("trocarModo", () => {
  const base: CamposDoExercicio = {
    series: "4",
    modo: "fixo",
    reps: "10",
    repsMax: "",
    descanso: "",
    observacao: "",
  };

  it("o número digitado passa para o primeiro campo", () => {
    expect(trocarModo(base, "faixa")).toMatchObject({ modo: "faixa", reps: "10", repsMax: "" });
    const faixa = { ...base, modo: "faixa" as const, reps: "8", repsMax: "12" };
    expect(trocarModo(faixa, "fixo")).toMatchObject({ modo: "fixo", reps: "8", repsMax: "" });
  });

  it('para outro formato, a faixa completa vira "8-12"', () => {
    const faixa = { ...base, modo: "faixa" as const, reps: "8", repsMax: "12" };
    expect(trocarModo(faixa, "outro")).toMatchObject({ modo: "outro", reps: "8-12" });
    expect(trocarModo({ ...faixa, repsMax: "" }, "outro").reps).toBe("8");
  });

  it("de volta para número, fica o número do começo do texto, ou nada", () => {
    const outro = { ...base, modo: "outro" as const, reps: "10 a 12" };
    expect(trocarModo(outro, "fixo").reps).toBe("10");
    expect(trocarModo({ ...outro, reps: "Até a falha" }, "fixo").reps).toBe("");
  });

  it("mesmo modo não mexe em nada", () => {
    expect(trocarModo(base, "fixo")).toBe(base);
  });
});
