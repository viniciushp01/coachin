import { describe, expect, it } from "vitest";
import { hojeDoAluno, progressoDoTreino, semanaDoTreino } from "./diaDoAluno";

describe("hojeDoAluno (regras 115 e 122)", () => {
  // 02h30 em UTC de 05/11: ainda é dia 04 em São Paulo (UTC-3) e já é dia 05 em Lisboa (UTC+0).
  const agora = new Date("2026-11-05T02:30:00Z");

  it("usa o fuso do aluno", () => {
    expect(hojeDoAluno("America/Sao_Paulo", agora)).toBe("2026-11-04");
    expect(hojeDoAluno("Europe/Lisbon", agora)).toBe("2026-11-05");
    expect(hojeDoAluno("Asia/Tokyo", agora)).toBe("2026-11-05");
  });

  it("sem conta (sem fuso), usa São Paulo", () => {
    expect(hojeDoAluno(null, agora)).toBe("2026-11-04");
  });
});

// O exemplo do Figma: 05/10 a 29/11 de 2026, 8 semanas.
const INICIO = "2026-10-05";
const FIM = "2026-11-29";

describe("semanaDoTreino (regra 10)", () => {
  it("dias 1 a 7 são a semana 1, e o dia 8 abre a semana 2", () => {
    expect(semanaDoTreino(INICIO, FIM, "2026-10-05")).toEqual({ atual: 1, total: 8 });
    expect(semanaDoTreino(INICIO, FIM, "2026-10-11")).toEqual({ atual: 1, total: 8 });
    expect(semanaDoTreino(INICIO, FIM, "2026-10-12")).toEqual({ atual: 2, total: 8 });
  });

  it("não segue a semana do calendário: 05/10 é segunda, 29/10 é a semana 4", () => {
    expect(semanaDoTreino(INICIO, FIM, "2026-10-29")).toEqual({ atual: 4, total: 8 });
  });

  it("o último dia é a última semana; relógio fora do período não passa dos limites", () => {
    expect(semanaDoTreino(INICIO, FIM, "2026-11-29")).toEqual({ atual: 8, total: 8 });
    expect(semanaDoTreino(INICIO, FIM, "2026-11-30")).toEqual({ atual: 8, total: 8 });
    expect(semanaDoTreino(INICIO, FIM, "2026-10-04")).toEqual({ atual: 1, total: 8 });
  });

  it("atravessa a virada do ano", () => {
    expect(semanaDoTreino("2026-12-28", "2027-01-10", "2027-01-04")).toEqual({
      atual: 2,
      total: 2,
    });
  });
});

describe("progressoDoTreino", () => {
  it("é a parte dos dias já corridos, contando hoje (138 de 310 no Figma, dia 25 de 56)", () => {
    expect(progressoDoTreino(INICIO, FIM, "2026-10-29")).toBeCloseTo(25 / 56);
  });

  it("fica entre 0 e 1", () => {
    expect(progressoDoTreino(INICIO, FIM, "2026-11-29")).toBe(1);
    expect(progressoDoTreino(INICIO, FIM, "2027-01-01")).toBe(1);
    expect(progressoDoTreino(INICIO, FIM, "2026-09-01")).toBe(0);
  });
});
