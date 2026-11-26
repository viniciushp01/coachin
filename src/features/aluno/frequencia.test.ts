import { describe, expect, it } from "vitest";
import type { FichaMarcada } from "@/features/acompanhar/logica";
import type { TreinoDoAluno } from "./dados";
import { treinoDoPainel } from "./frequencia";

const ativo: TreinoDoAluno = {
  id: "t2",
  nome: "Fase 2",
  inicio: "2026-10-05",
  fim: "2026-11-29",
  hoje: "2026-10-29",
  semana: { atual: 4, total: 8 },
  progresso: 0.5,
  concluido: false,
  fichas: [{ id: "a2", letra: "A", nome: "Peito", posicao: 1, removida: false, exercicios: [] }],
  marcacoes: [{ diaId: "a2", feitoEm: "2026-10-26", marcadaEm: "2026-10-26T10:00:00Z" }],
  cargas: {},
};
const antigas: FichaMarcada[] = [
  { id: "a1", treinoId: "t1", letra: "A", nome: "Antiga", removida: false, exercicios: 5 },
  { id: "a2", treinoId: "t2", letra: "A", nome: "Peito", removida: false, exercicios: 3 },
];
const marcacoesAntigas = [
  { diaId: "a1", feitoEm: "2026-09-10" },
  { diaId: "a2", feitoEm: "2026-10-26" },
];

describe("painel do dia da Frequência (regras 20 a 24 e 61)", () => {
  it("junta as marcações de treinos anteriores às do treino ativo, sem duplicar", () => {
    const t = treinoDoPainel(ativo, "2026-10-29", antigas, marcacoesAntigas);
    expect(t.marcacoes.map((m) => m.diaId).sort()).toEqual(["a1", "a2"]);
  });

  it("a ficha de treino anterior mantém o nome, mas não abre nem se marca", () => {
    const t = treinoDoPainel(ativo, "2026-10-29", antigas, marcacoesAntigas);
    const velha = t.fichas.find((f) => f.id === "a1")!;
    expect(velha.letra).toBe("A");
    expect(velha.nome).toBe("Antiga");
    expect(velha.removida).toBe(true);
  });

  it("a marcação do treino ativo vem da cópia com a fila local aplicada", () => {
    const comPendente = {
      ...ativo,
      marcacoes: [
        ...ativo.marcacoes,
        { diaId: "a2", feitoEm: "2026-10-28", marcadaEm: "x", pendente: true },
      ],
    };
    const t = treinoDoPainel(comPendente, "2026-10-29", antigas, marcacoesAntigas);
    expect(t.marcacoes.filter((m) => m.pendente)).toHaveLength(1);
  });

  it("sem treino ativo, nada pode ser marcado", () => {
    const t = treinoDoPainel(null, "2026-10-29", antigas, marcacoesAntigas);
    expect(t.fichas.every((f) => f.removida)).toBe(true);
    expect("2026-10-29" >= t.inicio).toBe(false);
  });
});
