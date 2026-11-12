import { describe, expect, it } from "vitest";
import {
  alturaEmTexto,
  avisoDeTreinoConcluido,
  detalheDaFicha,
  diaMesAno,
  diaNoFuso,
  estadoDoDia,
  fichasDoTreino,
  idadeEm,
  limitesDoCalendario,
  linkDoWhatsApp,
  marcasDoDia,
  nascimentoComIdade,
  periodoDoTreino,
  pesoEmTexto,
  podeAvancarMes,
  podeVoltarMes,
  situacaoDoTreino,
  telefoneParaExibir,
  textoDaUltimaCarga,
  textoDoMes,
  textoDosAnteriores,
  type FichaMarcada,
} from "./logica";

const ficha = (id: string, letra: string): FichaMarcada => ({
  id,
  treinoId: "w1",
  letra,
  nome: `Ficha ${letra}`,
  removida: false,
  exercicios: 6,
});
const fichas = [ficha("d1", "A"), ficha("d2", "B"), ficha("d3", "C")];

describe("calendário (regras 23, 43, 61 e 72)", () => {
  it("as letras das fichas feitas no dia, em ordem", () => {
    const marcacoes = [
      { diaId: "d2", feitoEm: "2026-10-27" },
      { diaId: "d1", feitoEm: "2026-10-27" },
      { diaId: "d3", feitoEm: "2026-10-28" },
    ];
    expect(marcasDoDia(marcacoes, fichas, "2026-10-27")).toBe("AB");
    expect(marcasDoDia(marcacoes, fichas, "2026-10-29")).toBe("");
  });

  it("dia futuro é neutro; hoje e o passado, não", () => {
    expect(estadoDoDia("2026-10-30", "2026-10-29")).toBe("futuro");
    expect(estadoDoDia("2026-10-29", "2026-10-29")).toBe("hoje");
    expect(estadoDoDia("2026-10-28", "2026-10-29")).toBe("padrao");
  });

  it("conta os treinos do mês, com singular e mês vazio", () => {
    const m = (feitoEm: string) => ({ diaId: "d1", feitoEm });
    const marcacoes = [m("2026-10-02"), m("2026-10-03"), m("2026-11-01")];
    expect(textoDoMes(marcacoes, { ano: 2026, mes: 10 })).toBe("2 treinos em outubro");
    expect(textoDoMes(marcacoes, { ano: 2026, mes: 11 })).toBe("1 treino em novembro");
    expect(textoDoMes(marcacoes, { ano: 2026, mes: 9 })).toBe("Nenhum treino em setembro");
    expect(textoDoMes(marcacoes, { ano: 2025, mes: 10 })).toBe("Nenhum treino em outubro");
  });

  it("os meses vão do primeiro treino ao fim do último (ou hoje)", () => {
    const treinos = [
      { inicio: "2026-07-06", fim: "2026-08-09" },
      { inicio: "2026-10-05", fim: "2026-11-29" },
    ];
    const { primeiro, ultimo } = limitesDoCalendario(treinos, [], "2026-10-29");
    expect(primeiro).toEqual({ ano: 2026, mes: 7 });
    expect(ultimo).toEqual({ ano: 2026, mes: 11 });
    expect(podeVoltarMes({ ano: 2026, mes: 7 }, primeiro)).toBe(false);
    expect(podeVoltarMes({ ano: 2026, mes: 8 }, primeiro)).toBe(true);
    expect(podeAvancarMes({ ano: 2026, mes: 11 }, ultimo)).toBe(false);
    expect(podeAvancarMes({ ano: 2026, mes: 10 }, ultimo)).toBe(true);
  });

  it("sem treino nenhum, o calendário fica no mês de hoje", () => {
    const { primeiro, ultimo } = limitesDoCalendario([], [], "2026-10-29");
    expect(primeiro).toEqual({ ano: 2026, mes: 10 });
    expect(ultimo).toEqual({ ano: 2026, mes: 10 });
  });

  it("marcação mais antiga que o primeiro treino ainda abre o mês dela", () => {
    const { primeiro } = limitesDoCalendario(
      [{ inicio: "2026-10-05", fim: "2026-11-29" }],
      [{ diaId: "d1", feitoEm: "2026-09-20" }],
      "2026-10-29",
    );
    expect(primeiro).toEqual({ ano: 2026, mes: 9 });
  });

  it("aviso de treino concluído só depois do fim (regras 43 e 72)", () => {
    expect(avisoDeTreinoConcluido("2026-10-25", "2026-10-29")).toBe("Treino concluído em 25/10");
    expect(avisoDeTreinoConcluido("2026-10-25", "2026-10-25")).toBeNull();
    expect(avisoDeTreinoConcluido(null, "2026-10-29")).toBeNull();
  });

  it("detalhe da ficha e situação do treino na data em que foi feita", () => {
    expect(detalheDaFicha("Costas e bíceps", 6)).toBe("Costas e bíceps · 6 exercícios");
    expect(detalheDaFicha("Costas", 1)).toBe("Costas · 1 exercício");
    expect(situacaoDoTreino("Hipertrofia · Fase 2", "2026-10-05", "2026-11-29", "2026-10-27")).toBe(
      "Hipertrofia · Fase 2 · Semana 4 de 8",
    );
  });
});

describe("datas no fuso do aluno (regra 115)", () => {
  it("o mesmo instante cai em dias diferentes conforme o fuso", () => {
    const instante = "2026-10-22T01:30:00Z";
    expect(diaNoFuso(instante, "America/Sao_Paulo")).toBe("2026-10-21");
    expect(diaNoFuso(instante, "Asia/Tokyo")).toBe("2026-10-22");
    expect(diaNoFuso(instante, null)).toBe("2026-10-21");
  });

  it("dd/mm/aaaa", () => {
    expect(diaMesAno("2026-10-22")).toBe("22/10/2026");
  });
});

describe("progressão e histórico (regras 44, 63 e 68)", () => {
  it("última carga com vírgula e dia/mês", () => {
    expect(textoDaUltimaCarga(55, "2026-10-22")).toBe("Última carga 55 kg · 22/10");
    expect(textoDaUltimaCarga(62.5, "2026-10-20")).toBe("Última carga 62,5 kg · 20/10");
  });

  it("período e semanas", () => {
    expect(periodoDoTreino("2026-08-10", "2026-10-04", 8)).toBe("10/08 – 04/10 · 8 semanas");
    expect(periodoDoTreino("2026-07-06", "2026-07-12", 1)).toBe("06/07 – 12/07 · 1 semana");
  });

  it("fichas por extenso", () => {
    expect(fichasDoTreino(["A", "B", "C"])).toBe("Fichas A, B e C");
    expect(fichasDoTreino(["B", "A"])).toBe("Fichas A e B");
    expect(fichasDoTreino(["A"])).toBe("Ficha A");
    expect(fichasDoTreino([])).toBe("Sem fichas");
  });

  it("treinos anteriores", () => {
    expect(textoDosAnteriores(0)).toBe("Nenhum treino anterior");
    expect(textoDosAnteriores(1)).toBe("1 treino anterior");
    expect(textoDosAnteriores(2)).toBe("2 treinos anteriores");
  });
});

describe("perfil (regras 41, 71 e 108)", () => {
  it("idade completa só depois do aniversário", () => {
    expect(idadeEm("1994-03-14", "2026-10-29")).toBe(32);
    expect(idadeEm("1994-12-01", "2026-10-29")).toBe(31);
    expect(idadeEm("1994-10-29", "2026-10-29")).toBe(32);
  });

  it("nascimento com a idade, no singular também", () => {
    expect(nascimentoComIdade("1994-03-14", "2026-10-29")).toBe("14/03/1994 · 32 anos");
    expect(nascimentoComIdade("2025-03-14", "2026-10-29")).toBe("14/03/2025 · 1 ano");
  });

  it("telefone formatado e link do WhatsApp só com dígitos", () => {
    expect(telefoneParaExibir("+5531987654321")).toBe("+55 (31) 98765-4321");
    expect(linkDoWhatsApp("+5531987654321")).toBe("https://wa.me/5531987654321");
    expect(linkDoWhatsApp("+351912345678")).toBe("https://wa.me/351912345678");
  });

  it("altura e peso com vírgula", () => {
    expect(alturaEmTexto(1.78)).toBe("1,78 m");
    expect(alturaEmTexto(1.8)).toBe("1,80 m");
    expect(pesoEmTexto(82)).toBe("82 kg");
    expect(pesoEmTexto(82.5)).toBe("82,5 kg");
  });
});
