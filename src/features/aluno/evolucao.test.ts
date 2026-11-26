import { describe, expect, it } from "vitest";
import {
  PERIODO_PADRAO,
  inicioDoPeriodo,
  montarGrafico,
  mostrarFiltro,
  registrosDoPeriodo,
  resumoDoPeriodo,
  seloDeVariacao,
  textoDoPeriodoVazio,
  type Registro,
} from "./evolucao";

const r = (dia: string, kg: number): Registro => ({ dia, kg });

// Puxada frontal do Figma (2b · 4): 40, 40, 45, 50, 55 kg.
const varias = [
  r("2026-08-20", 40),
  r("2026-09-10", 40),
  r("2026-09-24", 45),
  r("2026-10-08", 50),
  r("2026-10-22", 55),
];

describe("selo de variação (regra 175)", () => {
  it("aumento: compara com o registro anterior, em verde", () => {
    expect(seloDeVariacao(varias)).toEqual({
      tom: "alta",
      texto: "+5 kg",
      referencia: "desde 08/10",
    });
  });

  it("duas cargas: +5 kg desde a primeira", () => {
    expect(seloDeVariacao([r("2026-10-08", 35), r("2026-10-22", 40)])).toEqual({
      tom: "alta",
      texto: "+5 kg",
      referencia: "desde 08/10",
    });
  });

  it("cargas iguais: 'Mesma carga', em cinza", () => {
    expect(seloDeVariacao([r("2026-09-22", 60), r("2026-10-06", 60), r("2026-10-20", 60)])).toEqual(
      { tom: "neutro", texto: "Mesma carga", referencia: "desde 06/10" },
    );
  });

  it("carga menor: cinza neutro, com sinal de menos, nunca vermelho", () => {
    expect(
      seloDeVariacao([r("2026-09-22", 150), r("2026-10-06", 150), r("2026-10-20", 140)]),
    ).toEqual({
      tom: "neutro",
      texto: "−10 kg",
      referencia: "desde 06/10",
    });
  });

  it("variação com meio quilo usa vírgula", () => {
    expect(seloDeVariacao([r("2026-10-01", 40), r("2026-10-08", 42.5)])?.texto).toBe("+2,5 kg");
  });

  it("um registro só: sem selo", () => {
    expect(seloDeVariacao([r("2026-10-20", 50)])).toBeNull();
    expect(seloDeVariacao([])).toBeNull();
  });
});

describe("janela de cada período, a partir de hoje no fuso do aluno (regras 115 e 175)", () => {
  it("o padrão é 3 meses", () => {
    expect(PERIODO_PADRAO).toBe("3m");
  });

  it("30 dias: hoje menos 30 dias", () => {
    expect(inicioDoPeriodo("30d", "2026-11-26")).toBe("2026-10-27");
  });

  it("3 meses e 6 meses: mesmo dia dos meses anteriores", () => {
    expect(inicioDoPeriodo("3m", "2026-11-26")).toBe("2026-08-26");
    expect(inicioDoPeriodo("6m", "2026-11-26")).toBe("2026-05-26");
  });

  it("mês mais curto: cai no último dia dele", () => {
    expect(inicioDoPeriodo("3m", "2026-05-31")).toBe("2026-02-28");
    expect(inicioDoPeriodo("6m", "2026-08-31")).toBe("2026-02-28");
  });

  it("atravessa o ano", () => {
    expect(inicioDoPeriodo("3m", "2027-01-15")).toBe("2026-10-15");
    expect(inicioDoPeriodo("30d", "2027-01-10")).toBe("2026-12-11");
  });

  it("Tudo: sem início", () => {
    expect(inicioDoPeriodo("tudo", "2026-11-26")).toBeNull();
  });

  it("filtra os registros do período, incluindo o dia do início", () => {
    const todos = [r("2026-10-26", 1), r("2026-10-27", 2), r("2026-11-26", 3)];
    expect(registrosDoPeriodo(todos, "30d", "2026-11-26").map((x) => x.kg)).toEqual([2, 3]);
    expect(registrosDoPeriodo(todos, "tudo", "2026-11-26")).toHaveLength(3);
  });

  it("a virada do dia no fuso muda a janela (hoje é o do aluno, não o do aparelho)", () => {
    const todos = [r("2026-10-27", 2)];
    expect(registrosDoPeriodo(todos, "30d", "2026-11-26")).toHaveLength(1);
    expect(registrosDoPeriodo(todos, "30d", "2026-11-27")).toHaveLength(0);
  });
});

describe("resumo do período (regra 175)", () => {
  it("última menos primeira carga: sobe em verde", () => {
    expect(resumoDoPeriodo([r("2026-08-27", 45), r("2026-10-22", 55)], "3m")).toEqual({
      tom: "alta",
      texto: "+10 kg em 3 meses",
    });
  });

  it("cada período diz o seu nome; Tudo diz 'no total'", () => {
    const dois = [r("2026-08-27", 45), r("2026-10-22", 50)];
    expect(resumoDoPeriodo(dois, "30d")?.texto).toBe("+5 kg em 30 dias");
    expect(resumoDoPeriodo(dois, "6m")?.texto).toBe("+5 kg em 6 meses");
    expect(resumoDoPeriodo(dois, "tudo")?.texto).toBe("+5 kg no total");
  });

  it("igual ou menor: cinza neutro", () => {
    expect(resumoDoPeriodo([r("2026-09-01", 50), r("2026-10-22", 50)], "3m")).toEqual({
      tom: "neutro",
      texto: "Mesma carga em 3 meses",
    });
    expect(resumoDoPeriodo([r("2026-09-01", 50), r("2026-10-22", 45)], "tudo")).toEqual({
      tom: "neutro",
      texto: "−5 kg no total",
    });
  });

  it("sem resumo com menos de dois registros", () => {
    expect(resumoDoPeriodo([r("2026-10-22", 50)], "3m")).toBeNull();
    expect(resumoDoPeriodo([], "3m")).toBeNull();
  });
});

describe("quando o filtro aparece (regra 175)", () => {
  it("só com registros em mais de 30 dias", () => {
    expect(mostrarFiltro(varias)).toBe(true);
    expect(mostrarFiltro([r("2026-10-08", 35), r("2026-10-22", 40)])).toBe(false);
    expect(mostrarFiltro([r("2026-10-01", 35), r("2026-10-31", 40)])).toBe(false);
    expect(mostrarFiltro([r("2026-10-01", 35), r("2026-11-01", 40)])).toBe(true);
  });

  it("uma carga só ou nenhuma: sem filtro", () => {
    expect(mostrarFiltro([r("2026-10-20", 50)])).toBe(false);
    expect(mostrarFiltro([])).toBe(false);
  });
});

describe("texto do período sem registros (tela 11)", () => {
  it("o número acompanha o período", () => {
    expect(textoDoPeriodoVazio("30d")).toBe("nos últimos 30 dias");
    expect(textoDoPeriodoVazio("3m")).toBe("nos últimos 3 meses");
    expect(textoDoPeriodoVazio("6m")).toBe("nos últimos 6 meses");
  });
});

describe("gráfico: escala e posição dos pontos", () => {
  it("pontos nas datas reais: o eixo de tempo é proporcional", () => {
    const g = montarGrafico([r("2026-10-01", 40), r("2026-10-11", 45), r("2026-10-31", 50)]);
    const [a, b, c] = g.pontos;
    expect(a!.x).toBeCloseTo(g.area.esquerda);
    expect(c!.x).toBeCloseTo(g.area.direita);
    // 10 de 30 dias.
    expect(b!.x).toBeCloseTo(g.area.esquerda + (g.area.direita - g.area.esquerda) / 3);
  });

  it("y: o menor valor embaixo e o maior em cima", () => {
    const g = montarGrafico(varias);
    expect(g.pontos[0]!.y).toBeCloseTo(g.area.base);
    expect(g.pontos[4]!.y).toBeCloseTo(g.area.topo);
    // 45 kg está a um terço do caminho entre 40 e 55.
    expect(g.pontos[2]!.y).toBeCloseTo(g.area.base - (g.area.base - g.area.topo) / 3);
    expect(g.minimo).toBe(40);
    expect(g.maximo).toBe(55);
  });

  it("cargas iguais: linha reta no meio, eixo com um valor só", () => {
    const g = montarGrafico([r("2026-09-22", 60), r("2026-10-06", 60), r("2026-10-20", 60)]);
    for (const p of g.pontos) expect(p.y).toBeCloseTo((g.area.base + g.area.topo) / 2);
    expect(g.minimo).toBe(60);
    expect(g.maximo).toBe(60);
  });

  it("um ponto só: no meio, com o valor", () => {
    const g = montarGrafico([r("2026-10-20", 50)]);
    expect(g.pontos).toHaveLength(1);
    expect(g.pontos[0]!.x).toBeCloseTo((g.area.esquerda + g.area.direita) / 2);
    expect(g.rotulosX.map((x) => x.dia)).toEqual(["2026-10-20"]);
  });

  it("o último ponto é o destaque", () => {
    const g = montarGrafico(varias);
    expect(g.pontos.map((p) => p.destaque)).toEqual([false, false, false, false, true]);
  });

  it("mais de 8 pontos: pontos menores", () => {
    const muitos = Array.from({ length: 9 }, (_, i) =>
      r(`2026-10-${String(i + 1).padStart(2, "0")}`, 40 + i),
    );
    expect(montarGrafico(muitos).raio).toBeLessThan(montarGrafico(varias).raio);
    expect(montarGrafico(muitos.slice(0, 8)).raio).toBe(montarGrafico(varias).raio);
  });

  it("rótulos de data: primeiro, último e os do meio a no mínimo 52 px", () => {
    const g = montarGrafico(varias);
    const xs = g.rotulosX.map((x) => x.x);
    expect(g.rotulosX[0]!.dia).toBe("2026-08-20");
    expect(g.rotulosX.at(-1)!.dia).toBe("2026-10-22");
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(52);
  });

  it("muitos pontos juntos: só os rótulos que cabem", () => {
    const muitos = Array.from({ length: 20 }, (_, i) =>
      r(`2026-10-${String(i + 1).padStart(2, "0")}`, 40 + i),
    );
    const xs = montarGrafico(muitos).rotulosX.map((x) => x.x);
    expect(xs.length).toBeLessThan(8);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(52);
  });

  it("dois registros no mesmo dia ficam no mesmo x, sem dividir por zero", () => {
    const g = montarGrafico([r("2026-10-20", 50), r("2026-10-20", 55)]);
    expect(g.pontos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});
