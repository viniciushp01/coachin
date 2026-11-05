import { describe, expect, it } from "vitest";
import type { ItemDaFila } from "@/lib/filaLocal";
import type { DadosDoAluno, TreinoDoAluno } from "./dados";
import { aplicarFila, atualizarDia } from "./pendencias";

const treino: TreinoDoAluno = {
  id: "t1",
  nome: "Hipertrofia",
  inicio: "2026-10-05",
  fim: "2026-11-29",
  hoje: "2026-11-05",
  semana: { atual: 5, total: 8 },
  progresso: 0.5,
  concluido: false,
  fichas: [],
  marcacoes: [{ diaId: "a", feitoEm: "2026-11-03", marcadaEm: "2026-11-03T10:00:00Z" }],
  cargas: { ex1: { kg: 40, editadaEm: "2026-11-01T10:00:00Z" } },
};
const dados: DadosDoAluno = { hoje: "2026-11-05", fuso: "America/Sao_Paulo", treino };

let seq = 0;
const item = (acao: ItemDaFila["acao"], criadoEm: string): ItemDaFila => ({
  seq: ++seq,
  id: `i${seq}`,
  contaId: "c1",
  criadoEm,
  acao,
});

describe("aplicarFila (regra 116)", () => {
  it("sem itens, nada muda além da contagem", () => {
    expect(aplicarFila(dados, [])).toEqual({ ...dados, pendentes: 0 });
  });

  it("marcar entra como pendente e não duplica a mesma ficha no mesmo dia", () => {
    const m = { tipo: "marcar", diaId: "b", feitoEm: "2026-11-05" } as const;
    const r = aplicarFila(dados, [
      item(m, "2026-11-05T09:00:00Z"),
      item(m, "2026-11-05T09:01:00Z"),
    ]);
    expect(r.pendentes).toBe(2);
    expect(r.treino?.marcacoes.filter((x) => x.diaId === "b")).toEqual([
      { diaId: "b", feitoEm: "2026-11-05", marcadaEm: "2026-11-05T09:00:00Z", pendente: true },
    ]);
  });

  it("desfazer tira a marcação, também a já enviada; marcar de novo volta como pendente", () => {
    const d = { tipo: "desfazer", diaId: "a", feitoEm: "2026-11-03" } as const;
    const m = { tipo: "marcar", diaId: "a", feitoEm: "2026-11-03" } as const;
    expect(aplicarFila(dados, [item(d, "2026-11-05T09:00:00Z")]).treino?.marcacoes).toEqual([]);
    const volta = aplicarFila(dados, [
      item(d, "2026-11-05T09:00:00Z"),
      item(m, "2026-11-05T09:01:00Z"),
    ]);
    expect(volta.treino?.marcacoes).toMatchObject([{ diaId: "a", pendente: true }]);
  });

  it("a carga mais recente por data da edição vale", () => {
    const nova = item({ tipo: "carga", exercicioId: "ex1", kg: 45 }, "2026-11-05T09:00:00Z");
    const velha = item({ tipo: "carga", exercicioId: "ex1", kg: 20 }, "2026-10-01T09:00:00Z");
    expect(aplicarFila(dados, [nova]).treino?.cargas.ex1).toEqual({
      kg: 45,
      editadaEm: "2026-11-05T09:00:00Z",
      pendente: true,
    });
    expect(aplicarFila(dados, [velha]).treino?.cargas.ex1?.kg).toBe(40);
  });

  it("sem treino só conta os itens", () => {
    const r = aplicarFila({ hoje: "2026-11-05", treino: null }, [
      item({ tipo: "carga", exercicioId: "x", kg: 1 }, "2026-11-05T09:00:00Z"),
    ]);
    expect(r).toEqual({ hoje: "2026-11-05", treino: null, pendentes: 1 });
  });
});

describe("atualizarDia", () => {
  it("refaz o hoje e a semana da cópia guardada", () => {
    const r = atualizarDia(dados, new Date("2026-11-12T15:00:00Z"));
    expect(r.hoje).toBe("2026-11-12");
    expect(r.treino).toMatchObject({ hoje: "2026-11-12", semana: { atual: 6, total: 8 } });
  });

  it("depois do fim o treino aparece concluído", () => {
    const r = atualizarDia(dados, new Date("2026-12-05T15:00:00Z"));
    expect(r.treino).toMatchObject({ concluido: true, progresso: 1 });
  });

  it("no mesmo dia devolve igual", () => {
    expect(atualizarDia(dados, new Date("2026-11-05T15:00:00Z"))).toEqual(dados);
  });
});
