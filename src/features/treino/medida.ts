import { plural } from "@/lib/listas";

/** `exercises.measure`: repetições ou tempo (regra 124). */
export type Medida = "reps" | "time";

const SO_NUMERO = /^\d+$/;
const NUMERO_OU_FAIXA = /^\d+(\s*-\s*\d+)?$/;

/**
 * O que mostrar para `reps`, que é gravado como digitado (regra 124): num exercício de tempo, só o
 * número ganha o "s" ("30" → "30 s"); o resto ("30 s", "45-60 s", "10") fica como está.
 */
export function textoDaMedida(reps: string, medida: Medida) {
  return medida === "time" && SO_NUMERO.test(reps) ? `${reps} s` : reps;
}

/** A parte da medida na linha compacta do professor: número ou faixa de repetições leva "reps". */
function medidaCompacta(reps: string, medida: Medida) {
  if (medida === "time" || !NUMERO_OU_FAIXA.test(reps)) return textoDaMedida(reps, medida);
  return reps === "1" ? "1 rep" : `${reps} reps`;
}

/** "4 séries · 10 reps · descanso 90 s"; sem descanso, a parte some (regra 149 (5)). */
export function linhaDoExercicio({
  series,
  reps,
  medida,
  descanso,
}: {
  series: number;
  reps: string;
  medida: Medida;
  descanso: number;
}) {
  const partes = [plural(series, "série", "séries"), medidaCompacta(reps, medida)];
  if (descanso > 0) partes.push(`descanso ${descanso} s`);
  return partes.join(" · ");
}
