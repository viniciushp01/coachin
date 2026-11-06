// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { criarRascunho, type Ficha, type Rascunho } from "./rascunho";
import {
  apagarRascunhoGuardado,
  caminhoAte,
  comInicioValido,
  conferirComOCatalogo,
  exerciciosDaMontagem,
  guardarRascunho,
  lerRascunhoGuardado,
  limparRascunhos,
  passoParaGuardar,
  textoDoRascunhoGuardado,
  type RascunhoGuardado,
} from "./rascunhoGuardado";

const AGORA = new Date(2026, 10, 6, 15, 42);
const DIA_MS = 24 * 60 * 60 * 1000;
const depoisDe = (dias: number) => new Date(AGORA.getTime() + dias * DIA_MS);

const exercicio = (id: string, exercicioId: string) => ({
  id,
  exercicioId,
  nome: exercicioId,
  medida: "reps" as const,
  series: 3,
  reps: "10",
  descanso: 60,
  observacao: "",
});
const ficha = (id: string, ...ids: string[]): Ficha => ({
  id,
  nome: `Ficha ${id}`,
  exercicios: ids.map((e, i) => exercicio(`${id}-${i}`, e)),
});
const rascunho = (...fichas: Ficha[]): Rascunho => ({
  ...criarRascunho("2026-11-06"),
  nome: "Hipertrofia",
  fichas,
});
const guardado = (parcial: Partial<RascunhoGuardado> = {}): RascunhoGuardado => ({
  comecadoEm: AGORA.toISOString(),
  passo: "fichas",
  rascunho: rascunho(ficha("a", "supino")),
  edicao: null,
  ...parcial,
});

beforeEach(() => localStorage.clear());

describe("guardar e ler (regra 162)", () => {
  it("devolve o que guardou, com a ficha aberta e o passo", () => {
    const dados = guardado({ passo: "ficha", edicao: ficha("b", "remada") });
    guardarRascunho("prof", "aluno", dados, AGORA);
    expect(lerRascunhoGuardado("prof", "aluno", AGORA)).toEqual(dados);
  });

  it("é um por professor e aluno: outro professor não vê", () => {
    guardarRascunho("prof", "aluno", guardado(), AGORA);
    expect(lerRascunhoGuardado("outro", "aluno", AGORA)).toBeNull();
    expect(lerRascunhoGuardado("prof", "outro", AGORA)).toBeNull();
  });

  it("apagar tira só o daquele aluno", () => {
    guardarRascunho("prof", "a1", guardado(), AGORA);
    guardarRascunho("prof", "a2", guardado(), AGORA);
    apagarRascunhoGuardado("prof", "a1");
    expect(lerRascunhoGuardado("prof", "a1", AGORA)).toBeNull();
    expect(lerRascunhoGuardado("prof", "a2", AGORA)).not.toBeNull();
  });

  it("vale por 7 dias desde a última alteração e depois é apagado", () => {
    guardarRascunho("prof", "aluno", guardado(), AGORA);
    expect(lerRascunhoGuardado("prof", "aluno", depoisDe(7))).not.toBeNull();
    expect(lerRascunhoGuardado("prof", "aluno", depoisDe(7.1))).toBeNull();
    expect(lerRascunhoGuardado("prof", "aluno", AGORA)).toBeNull();
  });

  it.each([
    ["texto que não é JSON", "{quebrado"],
    ["versão de outro formato", JSON.stringify({ versao: 99, rascunho: {} })],
    [
      "campo com tipo errado",
      JSON.stringify({ versao: 1, ...guardado(), atualizadoEm: AGORA.toISOString(), passo: "x" }),
    ],
  ])("%s é descartado", (_, texto) => {
    const nome = "coachin:rascunho-treino:prof:aluno";
    localStorage.setItem(nome, texto);
    expect(lerRascunhoGuardado("prof", "aluno", AGORA)).toBeNull();
    expect(localStorage.getItem(nome)).toBeNull();
  });
});

describe("limparRascunhos", () => {
  it("apaga quem deixou de ser aluno e os vencidos, e não mexe nos de outro professor", () => {
    guardarRascunho("prof", "fica", guardado(), depoisDe(9));
    guardarRascunho("prof", "saiu", guardado(), depoisDe(9));
    guardarRascunho("prof", "venceu", guardado(), AGORA);
    guardarRascunho("outro", "saiu", guardado(), AGORA);

    limparRascunhos("prof", (id) => id !== "saiu", depoisDe(9));

    expect(lerRascunhoGuardado("prof", "fica", depoisDe(9))).not.toBeNull();
    expect(lerRascunhoGuardado("prof", "saiu", depoisDe(9))).toBeNull();
    expect(localStorage.getItem("coachin:rascunho-treino:prof:venceu")).toBeNull();
    expect(localStorage.getItem("coachin:rascunho-treino:outro:saiu")).not.toBeNull();
  });

  it("recusando todos, apaga todos da conta (exclusão de conta)", () => {
    guardarRascunho("prof", "a1", guardado(), AGORA);
    guardarRascunho("prof", "a2", guardado(), AGORA);
    limparRascunhos("prof", () => false, AGORA);
    expect(localStorage.length).toBe(0);
  });
});

describe("passos", () => {
  it.each([
    ["dados", false, false, "dados"],
    ["ficha", false, true, "dados"], // recarregou e ainda não confirmou Dados
    ["dados", true, true, "dados"],
    ["fichas", true, true, "fichas"],
    ["ficha", true, false, "fichas"],
    ["ficha", true, true, "ficha"],
    ["adicionar", true, true, "adicionar"],
    ["novo-exercicio", true, true, "adicionar"],
    ["ajustar-exercicio", true, true, "adicionar"],
    ["ocultos", true, true, "adicionar"],
  ])(
    "%s (dados confirmados: %s, ficha aberta: %s) guarda %s",
    (passo, confirmados, aberta, fim) => {
      expect(passoParaGuardar({ passo, dadosConfirmados: confirmados, fichaAberta: aberta })).toBe(
        fim,
      );
    },
  );

  it("o caminho passa por todos os passos, para o voltar andar um por vez", () => {
    expect(caminhoAte("dados")).toEqual(["dados"]);
    expect(caminhoAte("fichas")).toEqual(["fichas"]);
    expect(caminhoAte("ficha")).toEqual(["fichas", "ficha"]);
    expect(caminhoAte("adicionar")).toEqual(["fichas", "ficha", "adicionar"]);
  });
});

describe("validar ao continuar", () => {
  it("início passado vira hoje; hoje e futuro ficam", () => {
    const r = rascunho();
    expect(comInicioValido({ ...r, inicio: "2026-11-01" }, "2026-11-06").inicio).toBe("2026-11-06");
    expect(comInicioValido({ ...r, inicio: "2026-11-06" }, "2026-11-06").inicio).toBe("2026-11-06");
    expect(comInicioValido({ ...r, inicio: "2026-12-01" }, "2026-11-06").inicio).toBe("2026-12-01");
  });

  it("lista os exercícios sem repetir, com os da ficha aberta", () => {
    expect(
      exerciciosDaMontagem({
        rascunho: rascunho(ficha("a", "supino", "remada"), ficha("b", "supino")),
        edicao: ficha("c", "agachamento"),
      }),
    ).toEqual(["supino", "remada", "agachamento"]);
  });

  it("a medida vem do catálogo e o que não existe mais sai, também da ficha aberta", () => {
    const { rascunho: r, edicao } = conferirComOCatalogo(
      {
        rascunho: rascunho(ficha("a", "supino", "sumiu")),
        edicao: ficha("b", "sumiu", "prancha"),
      },
      new Map([
        ["supino", "reps"],
        ["prancha", "time"],
      ]),
    );
    expect(r.fichas[0]!.exercicios.map((e) => e.exercicioId)).toEqual(["supino"]);
    expect(edicao!.exercicios.map((e) => [e.exercicioId, e.medida])).toEqual([["prancha", "time"]]);
  });
});

describe("texto da folha", () => {
  it("conta fichas e exercícios, no singular e no plural", () => {
    expect(textoDoRascunhoGuardado(guardado())).toBe(
      "Você começou em 06/11, às 15:42. Tem 1 ficha e 1 exercício. Fica guardado só neste aparelho.",
    );
    expect(
      textoDoRascunhoGuardado(
        guardado({ rascunho: rascunho(ficha("a", "x", "y"), ficha("b", "z")) }),
      ),
    ).toContain("Tem 2 fichas e 3 exercícios.");
  });

  it("a ficha aberta conta como está na tela, nova ou já na lista", () => {
    const salva = ficha("a", "x");
    const editada = { ...salva, exercicios: [...salva.exercicios, exercicio("n", "y")] };
    expect(
      textoDoRascunhoGuardado(guardado({ rascunho: rascunho(salva), edicao: editada })),
    ).toContain("Tem 1 ficha e 2 exercícios.");
    expect(
      textoDoRascunhoGuardado(guardado({ rascunho: rascunho(salva), edicao: ficha("b", "y") })),
    ).toContain("Tem 2 fichas e 2 exercícios.");
  });

  it("ficha aberta ainda vazia não conta; sem nada, fala em zero", () => {
    expect(
      textoDoRascunhoGuardado(
        guardado({ rascunho: rascunho(), edicao: { id: "n", nome: "", exercicios: [] } }),
      ),
    ).toContain("Tem 0 fichas e 0 exercícios.");
  });
});
