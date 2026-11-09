import { describe, expect, it } from "vitest";
import {
  dataPorExtenso,
  diasDaSemana,
  feitaHoje,
  fichaDeHoje,
  lerCarga,
  textoDaCarga,
  podeMarcar,
  rotuloDaSemana,
  textoDaSerie,
  type DiaDaFicha,
  type Marcacao,
} from "./logica";

const dia = (letra: string, posicao: number, removida = false): DiaDaFicha => ({
  id: letra,
  letra,
  posicao,
  removida,
});
const feita = (diaId: string, feitoEm: string, marcadaEm = `${feitoEm}T10:00:00Z`): Marcacao => ({
  diaId,
  feitoEm,
  marcadaEm,
});

describe("feitaHoje (regra 163)", () => {
  it("é nula sem marcação com a data de hoje", () => {
    expect(feitaHoje([], "2026-11-07")).toBeNull();
    expect(feitaHoje([feita("D", "2026-11-05")], "2026-11-07")).toBeNull();
  });

  it("devolve a marcação de hoje", () => {
    const marcacoes = [feita("D", "2026-11-05"), feita("A", "2026-11-07")];
    expect(feitaHoje(marcacoes, "2026-11-07")?.diaId).toBe("A");
  });

  it("com duas no mesmo dia, vale a última marcada", () => {
    const marcacoes = [
      feita("A", "2026-11-07", "2026-11-07T09:00:00Z"),
      feita("B", "2026-11-07", "2026-11-07T18:00:00Z"),
    ];
    expect(feitaHoje(marcacoes, "2026-11-07")?.diaId).toBe("B");
  });

  it("marcação aguardando envio conta", () => {
    expect(
      feitaHoje([{ ...feita("A", "2026-11-07"), pendente: true }], "2026-11-07"),
    ).not.toBeNull();
  });

  it("na virada do dia volta a ser nula", () => {
    expect(feitaHoje([feita("A", "2026-11-07")], "2026-11-08")).toBeNull();
  });
});

describe("fichaDeHoje (regras 14 a 17 e 111)", () => {
  const abc = [dia("A", 1), dia("B", 2), dia("C", 3)];

  it("treino novo começa na primeira (regra 17)", () => {
    expect(fichaDeHoje(abc, [])?.letra).toBe("A");
  });
  it("segue a ordem e volta ao início depois da última", () => {
    expect(fichaDeHoje(abc, [feita("A", "2026-11-02")])?.letra).toBe("B");
    expect(fichaDeHoje(abc, [feita("C", "2026-11-02")])?.letra).toBe("A");
  });
  it("vale a do dia mais recente; no mesmo dia, a última marcada (regra 16)", () => {
    const marcacoes = [feita("B", "2026-11-03"), feita("A", "2026-11-02")];
    expect(fichaDeHoje(abc, marcacoes)?.letra).toBe("C");
    const mesmoDia = [
      feita("A", "2026-11-03", "2026-11-03T08:00:00Z"),
      feita("B", "2026-11-03", "2026-11-03T09:00:00Z"),
    ];
    expect(fichaDeHoje(abc, mesmoDia)?.letra).toBe("C");
  });
  it("pula a ficha removida (regra 111)", () => {
    const semB = [dia("A", 1), dia("B", 2, true), dia("C", 3)];
    expect(fichaDeHoje(semB, [feita("A", "2026-11-02")])?.letra).toBe("C");
  });
  it("última feita removida: segue a próxima que existe, ou volta à primeira", () => {
    const semB = [dia("A", 1), dia("B", 2, true), dia("C", 3)];
    expect(fichaDeHoje(semB, [feita("B", "2026-11-02")])?.letra).toBe("C");
    const semC = [dia("A", 1), dia("B", 2), dia("C", 3, true)];
    expect(fichaDeHoje(semC, [feita("C", "2026-11-02")])?.letra).toBe("A");
  });
  it("sem fichas, não há ficha de hoje", () => {
    expect(fichaDeHoje([dia("A", 1, true)], [])).toBeNull();
  });
});

describe("semana", () => {
  it("vai de segunda a domingo (quinta 29/10/2026)", () => {
    const dias = diasDaSemana("2026-10-29");
    expect(dias[0]).toBe("2026-10-26");
    expect(dias[6]).toBe("2026-11-01");
    expect(diasDaSemana("2026-11-01")[0]).toBe("2026-10-26");
    expect(diasDaSemana("2026-10-26")[0]).toBe("2026-10-26");
  });
  it("rótulo com mês só no fim, ou nos dois", () => {
    expect(rotuloDaSemana(diasDaSemana("2026-10-29"))).toBe("26 out – 1 nov");
    expect(rotuloDaSemana(diasDaSemana("2026-11-24"))).toBe("23 – 29 nov");
  });
});

describe("podeMarcar (regras 23 e 24)", () => {
  it("do início até hoje; futuro e antes do início não", () => {
    expect(podeMarcar("2026-10-05", "2026-10-29", "2026-10-29")).toBe(true);
    expect(podeMarcar("2026-10-05", "2026-10-05", "2026-10-29")).toBe(true);
    expect(podeMarcar("2026-10-05", "2026-10-04", "2026-10-29")).toBe(false);
    expect(podeMarcar("2026-10-05", "2026-10-30", "2026-10-29")).toBe(false);
  });
});

describe("textoDaSerie (regra 124)", () => {
  it("repetições e tempo", () => {
    expect(textoDaSerie(3, "12", "reps")).toBe("3 séries · 12 repetições");
    expect(textoDaSerie(1, "1", "reps")).toBe("1 série · 1 repetição");
    expect(textoDaSerie(4, "8-12", "reps")).toBe("4 séries · 8-12 repetições");
    expect(textoDaSerie(3, "30", "time")).toBe("3 séries · 30 s");
    expect(textoDaSerie(3, "45-60 s", "time")).toBe("3 séries · 45-60 s");
    expect(textoDaSerie(3, "até a falha", "reps")).toBe("3 séries · até a falha");
  });
});

describe("dataPorExtenso", () => {
  it("dia da semana e mês (Figma: Quinta, 29 de outubro)", () => {
    expect(dataPorExtenso("2026-10-29")).toBe("Quinta, 29 de outubro");
    expect(dataPorExtenso("2026-11-29")).toBe("Domingo, 29 de novembro");
    expect(dataPorExtenso("2026-10-27")).toBe("Terça, 27 de outubro");
  });
});

describe("carga (regra 26)", () => {
  it("lê com vírgula ou ponto e recusa o que o banco recusa", () => {
    expect(lerCarga("62,5")).toBe(62.5);
    expect(lerCarga(" 60 ")).toBe(60);
    expect(lerCarga("0")).toBeNull();
    expect(lerCarga("")).toBeNull();
    expect(lerCarga("1001")).toBeNull();
    expect(lerCarga("abc")).toBeNull();
    expect(textoDaCarga(62.5)).toBe("62,5");
    expect(textoDaCarga(60)).toBe("60");
  });
});
