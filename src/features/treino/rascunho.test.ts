import { describe, expect, it } from "vitest";
import {
  adicionarFicha,
  avisoDoInicio,
  criarRascunho,
  esquemaDoExercicio,
  fimDoTreino,
  letraDaFicha,
  mudou,
  novoExercicio,
  paraSaveWorkout,
  removerExercicio,
  removerFicha,
  salvarExercicio,
  salvarFicha,
  tituloDaFicha,
  validarDados,
  validarFicha,
  validarTreino,
  type ExercicioDoRascunho,
  type Rascunho,
} from "./rascunho";

const HOJE = "2026-10-29";

const supino: ExercicioDoRascunho = {
  id: "e1",
  exercicioId: "uuid-supino",
  nome: "Supino reto",
  medida: "reps",
  series: 4,
  reps: "10",
  descanso: 90,
  observacao: "Banco reto",
};

/** Rascunho com fichas de nomes dados, cada uma com um supino se `comExercicio`. */
function comFichas(nomes: string[], comExercicio = true): Rascunho {
  return nomes.reduce((r, nome) => {
    const novo = adicionarFicha(r);
    const ficha = novo.fichas.at(-1)!;
    return salvarFicha(novo, {
      ...ficha,
      nome,
      exercicios: comExercicio ? [supino] : [],
    });
  }, criarRascunho(HOJE));
}

describe("fimDoTreino (regra 73)", () => {
  it.each([
    ["2026-10-29", 8, "2026-12-23"],
    ["2026-11-03", 8, "2026-12-28"],
    ["2026-10-29", 1, "2026-11-04"],
    ["2026-12-30", 1, "2027-01-05"],
    ["2028-02-23", 1, "2028-02-29"],
  ])("início %s com %i semanas termina em %s", (inicio, semanas, fim) => {
    expect(fimDoTreino(inicio, semanas)).toBe(fim);
  });
});

describe("avisoDoInicio (regras 75 e 150 (1))", () => {
  it("início hoje com treino atual: fica ativo e o anterior vai para o Histórico", () => {
    expect(avisoDoInicio({ inicio: HOJE, hoje: HOJE, semanas: 8, temTreinoAtual: true })).toBe(
      "O treino dura 8 semanas a partir do início. Fica ativo hoje e o anterior vai para o Histórico.",
    );
  });

  it("início hoje sem treino atual: não fala de anterior", () => {
    expect(avisoDoInicio({ inicio: HOJE, hoje: HOJE, semanas: 8, temTreinoAtual: false })).toBe(
      "O treino dura 8 semanas a partir do início. Fica ativo hoje.",
    );
  });

  it("1 semana fica no singular", () => {
    expect(avisoDoInicio({ inicio: HOJE, hoje: HOJE, semanas: 1, temTreinoAtual: true })).toBe(
      "O treino dura 1 semana a partir do início. Fica ativo hoje e o anterior vai para o Histórico.",
    );
  });

  it("início futuro: fica agendado", () => {
    expect(
      avisoDoInicio({ inicio: "2026-11-03", hoje: HOJE, semanas: 8, temTreinoAtual: true }),
    ).toBe("Fica agendado. Só você vê até 03/11, e pode alterar ou cancelar antes.");
  });
});

describe("Rascunho novo", () => {
  it("começa hoje, com 8 semanas e sem fichas", () => {
    expect(criarRascunho(HOJE)).toEqual({
      nome: "",
      inicio: HOJE,
      semanas: 8,
      frequencia: "",
      fichas: [],
    });
  });
});

describe("Letras acompanham a posição até o primeiro salvamento (regra 149 (3))", () => {
  it("segue a sequência de private.letter_for", () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(letraDaFicha)).toEqual([
      "A",
      "B",
      "Z",
      "AA",
      "AB",
      "AZ",
      "BA",
    ]);
  });

  it("remover a primeira ficha faz a segunda virar A", () => {
    const r = comFichas(["Peito", "Costas", "Pernas"]);
    const sem = removerFicha(r, r.fichas[0]!.id);
    expect(sem.fichas.map((f, i) => tituloDaFicha(f, i))).toEqual([
      "Ficha A · Costas",
      "Ficha B · Pernas",
    ]);
  });

  it("ficha sem nome mostra só a letra", () => {
    const r = adicionarFicha(criarRascunho(HOJE));
    expect(tituloDaFicha(r.fichas[0]!, 0)).toBe("Ficha A");
  });
});

describe("Fichas e exercícios no rascunho", () => {
  it("adicionar dá ids diferentes e mantém a ordem", () => {
    const r = adicionarFicha(adicionarFicha(criarRascunho(HOJE)));
    expect(r.fichas).toHaveLength(2);
    expect(r.fichas[0]!.id).not.toBe(r.fichas[1]!.id);
  });

  it("salvar ficha troca só a ficha certa e não muda o original", () => {
    const r = comFichas(["Peito", "Costas"]);
    const antes = JSON.stringify(r);
    const novo = salvarFicha(r, { ...r.fichas[1]!, nome: "Dorsais" });
    expect(novo.fichas.map((f) => f.nome)).toEqual(["Peito", "Dorsais"]);
    expect(JSON.stringify(r)).toBe(antes);
  });

  it("salvar exercício adiciona no fim ou troca o que já existe", () => {
    const ficha = { id: "f", nome: "Peito", exercicios: [supino] };
    const crucifixo = { ...supino, id: "e2", nome: "Crucifixo" };
    expect(salvarExercicio(ficha, crucifixo).exercicios.map((e) => e.nome)).toEqual([
      "Supino reto",
      "Crucifixo",
    ]);
    expect(
      salvarExercicio(ficha, { ...supino, series: 5 }).exercicios.map((e) => e.series),
    ).toEqual([5]);
  });

  it("remover exercício tira só ele", () => {
    const crucifixo = { ...supino, id: "e2", nome: "Crucifixo" };
    const ficha = { id: "f", nome: "Peito", exercicios: [supino, crucifixo] };
    expect(removerExercicio(ficha, "e1").exercicios).toEqual([crucifixo]);
  });

  it("novoExercicio guarda o catálogo e os valores lidos, com id próprio", () => {
    const valores = { series: 3, reps: "45 s", descanso: 0, observacao: "" };
    const a = novoExercicio({ id: "uuid", nome: "Prancha", measure: "time" }, valores);
    const b = novoExercicio({ id: "uuid", nome: "Prancha", measure: "time" }, valores);
    expect(a).toMatchObject({ exercicioId: "uuid", nome: "Prancha", medida: "time", ...valores });
    expect(a.id).not.toBe(b.id);
  });
});

describe("Saber se mudou (regra 107)", () => {
  it("igual não mudou; qualquer diferença mudou", () => {
    const r = comFichas(["Peito"]);
    expect(mudou(r, structuredClone(r))).toBe(false);
    expect(mudou(r, { ...r, nome: "Novo" })).toBe(true);
    expect(mudou(r, removerFicha(r, r.fichas[0]!.id))).toBe(true);
  });
});

describe("validarDados (regras 105 e 154)", () => {
  it("exige o nome; só espaço não vale", () => {
    expect(validarDados({ nome: "   ", semanas: 8 })).toEqual({
      nome: "Digite o nome do treino.",
    });
  });

  it.each([0, 105])("recusa %i semanas", (semanas) => {
    expect(validarDados({ nome: "A", semanas })).toEqual({
      semanas: "Use de 1 a 104 semanas.",
    });
  });

  it.each([1, 104])("aceita %i semanas", (semanas) => {
    expect(validarDados({ nome: "A", semanas })).toEqual({});
  });
});

describe("validarFicha (regra 104)", () => {
  it("sem exercício e sem nome, os dois erros", () => {
    expect(validarFicha({ id: "f", nome: " ", exercicios: [] })).toEqual({
      nome: "Digite o nome da ficha.",
      semExercicio: true,
    });
  });

  it("com nome e exercício, nada", () => {
    expect(validarFicha({ id: "f", nome: "Peito", exercicios: [supino] })).toEqual({});
  });
});

describe("validarTreino (regra 104)", () => {
  it("sem ficha", () => {
    expect(validarTreino(criarRascunho(HOJE))).toEqual({ tipo: "sem_ficha" });
  });

  it("aponta a primeira ficha sem exercício pela letra", () => {
    const r = comFichas(["Peito"]);
    const comVazias = adicionarFicha(adicionarFicha(r));
    expect(validarTreino(comVazias)).toEqual({
      tipo: "ficha_sem_exercicio",
      letra: "B",
      fichas: [comVazias.fichas[1]!.id, comVazias.fichas[2]!.id],
    });
  });

  it("tudo certo: nulo", () => {
    expect(validarTreino(comFichas(["Peito", "Costas"]))).toBeNull();
  });
});

describe("esquemaDoExercicio (regras 124 e 149 (4))", () => {
  const ler = (
    medida: "reps" | "time",
    campos: Partial<{ series: string; reps: string; descanso: string; observacao: string }>,
  ) => {
    const resultado = esquemaDoExercicio(medida).safeParse({
      series: "",
      reps: "",
      descanso: "",
      observacao: "",
      ...campos,
    });
    return resultado.success
      ? { dados: resultado.data }
      : {
          erros: Object.fromEntries(
            resultado.error.issues.map((i) => [String(i.path[0]), i.message]),
          ),
        };
  };

  it("vazio: séries e repetições obrigatórias", () => {
    expect(ler("reps", {}).erros).toEqual({
      series: "Digite o número de séries (de 1 a 20).",
      reps: "Digite as repetições.",
    });
  });

  it("exercício de tempo pede o tempo", () => {
    expect(ler("time", {}).erros!.reps).toBe("Digite o tempo.");
  });

  it.each(["0", "21", "2,5", "abc", "99999999999"])("recusa %s séries", (series) => {
    expect(ler("reps", { series, reps: "10" }).erros).toEqual({
      series: "Digite o número de séries (de 1 a 20).",
    });
  });

  it.each(["1", "20", " 4 "])("aceita %s séries", (series) => {
    expect(ler("reps", { series, reps: "10" }).dados!.series).toBe(Number(series));
  });

  it("repetições: até 20 caracteres, depois de tirar os espaços das pontas", () => {
    const vinte = "x".repeat(20);
    expect(ler("reps", { series: "3", reps: ` ${vinte} ` }).dados!.reps).toBe(vinte);
    expect(ler("reps", { series: "3", reps: `${vinte}x` }).erros).toEqual({
      reps: "Confira as repetições.",
    });
  });

  it.each([
    ["", 0],
    ["  ", 0],
    ["0", 0],
    ["90", 90],
    ["90 s", 90],
    ["90s", 90],
    ["600", 600],
  ])('descanso "%s" grava %i', (descanso, segundos) => {
    expect(ler("reps", { series: "3", reps: "10", descanso }).dados!.descanso).toBe(segundos);
  });

  it.each(["601", "abc", "1 min", "-5"])('recusa o descanso "%s"', (descanso) => {
    expect(ler("reps", { series: "3", reps: "10", descanso }).erros).toEqual({
      descanso: "Confira o tempo de descanso.",
    });
  });

  it("observação sem espaços nas pontas", () => {
    expect(
      ler("reps", { series: "3", reps: "10", observacao: "  Controle a descida " }).dados!
        .observacao,
    ).toBe("Controle a descida");
  });
});

describe("paraSaveWorkout (migration 0012)", () => {
  it("gera o p_data na ordem do rascunho, sem ids locais e com frequência", () => {
    const base = comFichas(["Peito", "Costas"]);
    const r: Rascunho = {
      ...base,
      nome: " Hipertrofia · Fase 3 ",
      semanas: 8,
      frequencia: " 5x por semana ",
    };
    expect(paraSaveWorkout(r)).toEqual({
      name: "Hipertrofia · Fase 3",
      start_date: HOJE,
      weeks: 8,
      suggested_frequency: "5x por semana",
      days: [
        {
          id: null,
          name: "Peito",
          exercises: [
            {
              exercise_id: "uuid-supino",
              sets: 4,
              reps: "10",
              rest_seconds: 90,
              note: "Banco reto",
            },
          ],
        },
        {
          id: null,
          name: "Costas",
          exercises: [
            {
              exercise_id: "uuid-supino",
              sets: 4,
              reps: "10",
              rest_seconds: 90,
              note: "Banco reto",
            },
          ],
        },
      ],
    });
  });

  it("frequência e observação vazias vão nulas; reps segue como digitado", () => {
    const base = comFichas(["Peito"]);
    const ficha = base.fichas[0]!;
    const r = salvarFicha(base, {
      ...ficha,
      exercicios: [{ ...supino, reps: "45-60 s", descanso: 0, observacao: "" }],
    });
    const dados = paraSaveWorkout(r);
    expect(dados.suggested_frequency).toBeNull();
    expect(dados.days[0]!.exercises[0]).toEqual({
      exercise_id: "uuid-supino",
      sets: 4,
      reps: "45-60 s",
      rest_seconds: 0,
      note: null,
    });
  });
});
