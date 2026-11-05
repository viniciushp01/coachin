// Os campos da folha "Editar exercício" como a tela os guarda (regra 159): repetições em três modos
// e descanso em atalhos. O que vai ao rascunho e a `save_workout` continua o de sempre: `reps` é um
// texto de até 20 caracteres e `descanso`, um inteiro em segundos (`esquemaDoExercicio`).
import type { Medida } from "./medida";
import type { ValoresDoExercicio } from "./rascunho";

/** Número fixo ("10"), faixa ("8-12") ou o texto livre de antes (regra 159 (2)). */
export type ModoDasReps = "fixo" | "faixa" | "outro";

export type CamposDoExercicio = {
  series: string;
  modo: ModoDasReps;
  /** Fixo e faixa: o número (o mínimo, na faixa). Outro formato: o texto. */
  reps: string;
  /** Só na faixa. */
  repsMax: string;
  /** Só dígitos, em segundos; vazio é sem descanso. */
  descanso: string;
  observacao: string;
};

export const ATALHOS_DE_DESCANSO = [30, 45, 60, 90, 120] as const;

const FIXO = /^\d{1,3}$/;
const FAIXA_REPS = /^(\d{1,3})\s*-\s*(\d{1,3})$/;
/** Exercício de tempo aceita o "s" depois da faixa, que é como a regra 159 grava ("30-45 s"). */
const FAIXA_TEMPO = /^(\d{1,3})\s*-\s*(\d{1,3})(?:\s*s)?$/i;

/** Tira o que não é dígito: os campos de número só guardam número. */
export const soDigitos = (texto: string) => texto.replace(/\D/g, "");

/** O atalho que o descanso digitado marca, se algum (regra 159 (4)). */
export function atalhoDoDescanso(descanso: string) {
  if (!/^\d+$/.test(descanso)) return undefined;
  return ATALHOS_DE_DESCANSO.find((a) => a === Number(descanso));
}

/** Descanso que não bate com atalho: a folha abre com "Outro" e o valor (regra 159 (4)). */
export const descansoEmOutro = (descanso: number) =>
  descanso > 0 && !ATALHOS_DE_DESCANSO.some((a) => a === descanso);

/**
 * Abrir um exercício que já está na ficha (regra 159 (2)): só número → fixo; número, hífen e número
 * → faixa; qualquer outro texto → "Outro formato". Campos vazios para o exercício novo (regra 149).
 */
export function camposIniciais(
  inicial: ValoresDoExercicio | undefined,
  medida: Medida,
): CamposDoExercicio {
  if (!inicial) {
    return { series: "", modo: "fixo", reps: "", repsMax: "", descanso: "", observacao: "" };
  }
  const comum = {
    series: String(inicial.series),
    descanso: inicial.descanso ? String(inicial.descanso) : "",
    observacao: inicial.observacao,
  };
  const reps = inicial.reps.trim();
  if (FIXO.test(reps)) return { ...comum, modo: "fixo", reps, repsMax: "" };
  const faixa = (medida === "time" ? FAIXA_TEMPO : FAIXA_REPS).exec(reps);
  if (faixa) return { ...comum, modo: "faixa", reps: faixa[1]!, repsMax: faixa[2]! };
  return { ...comum, modo: "outro", reps: inicial.reps, repsMax: "" };
}

/**
 * Trocar de modo leva o que já foi digitado para o primeiro campo (regra 159 (2)). Para "Outro
 * formato", uma faixa completa vira o texto "8-12"; de volta, só o número do começo do texto.
 */
export function trocarModo(campos: CamposDoExercicio, modo: ModoDasReps): CamposDoExercicio {
  if (modo === campos.modo) return campos;
  if (modo === "outro") {
    const texto =
      campos.modo === "faixa" && campos.reps && campos.repsMax
        ? `${campos.reps}-${campos.repsMax}`
        : campos.reps;
    return { ...campos, modo, reps: texto, repsMax: "" };
  }
  const numero =
    campos.modo === "outro" ? (/^\s*(\d{1,3})/.exec(campos.reps)?.[1] ?? "") : campos.reps;
  return { ...campos, modo, reps: numero, repsMax: "" };
}
