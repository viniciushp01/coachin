import { describe, expect, it } from "vitest";
import { linhaDoExercicio, textoDaMedida } from "./medida";

describe("textoDaMedida (regra 124)", () => {
  it.each([
    ["30", "time", "30 s"],
    ["30 s", "time", "30 s"],
    ["45-60 s", "time", "45-60 s"],
    ["10", "reps", "10"],
    ["8-12", "reps", "8-12"],
    ["30 s", "reps", "30 s"],
  ] as const)("%s em %s vira %s", (reps, medida, texto) => {
    expect(textoDaMedida(reps, medida)).toBe(texto);
  });
});

describe("linhaDoExercicio (regra 149 (5))", () => {
  it.each([
    [{ series: 4, reps: "10", medida: "reps", descanso: 90 }, "4 séries · 10 reps · descanso 90 s"],
    [{ series: 3, reps: "45 s", medida: "time", descanso: 45 }, "3 séries · 45 s · descanso 45 s"],
    [{ series: 3, reps: "45", medida: "time", descanso: 45 }, "3 séries · 45 s · descanso 45 s"],
    [{ series: 4, reps: "10", medida: "reps", descanso: 0 }, "4 séries · 10 reps"],
    [
      { series: 3, reps: "8-12", medida: "reps", descanso: 60 },
      "3 séries · 8-12 reps · descanso 60 s",
    ],
    [{ series: 1, reps: "1", medida: "reps", descanso: 0 }, "1 série · 1 rep"],
    [{ series: 2, reps: "até a falha", medida: "reps", descanso: 0 }, "2 séries · até a falha"],
  ] as const)("%o vira %s", (exercicio, linha) => {
    expect(linhaDoExercicio(exercicio)).toBe(linha);
  });
});
