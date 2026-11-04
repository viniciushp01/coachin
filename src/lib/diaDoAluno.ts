// O tempo do treino na visão do aluno: "hoje" no fuso dele e a semana do treino (regras 10 e 115).
// As datas são de calendário, "aaaa-mm-dd", como as de `src/ui/datas.ts`.

/** Mesmo padrão de `private.student_today` no banco, para o aluno ainda sem conta. */
const FUSO_PADRAO = "America/Sao_Paulo";

const DIA_EM_MS = 86_400_000;

/** Hoje em `fuso` (`profiles.timezone`); sem conta não há fuso, e vale São Paulo. */
export function hojeDoAluno(fuso: string | null | undefined, agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso ?? FUSO_PADRAO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

function diasEntre(de: string, ate: string) {
  return (Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_EM_MS;
}

const entre = (minimo: number, valor: number, maximo: number) =>
  Math.min(Math.max(valor, minimo), maximo);

/** Dias do treino, contando o início e o fim (o fim é início + semanas × 7 − 1). */
const diasDoTreino = (inicio: string, fim: string) => diasEntre(inicio, fim) + 1;

/**
 * A semana conta a partir do dia de início: dias 1 a 7 são a semana 1, não a de segunda a domingo
 * (regra 10). Fora do período (relógio do aparelho) fica na primeira ou na última.
 */
export function semanaDoTreino(inicio: string, fim: string, hoje: string) {
  const total = Math.round(diasDoTreino(inicio, fim) / 7);
  return { atual: entre(1, Math.floor(diasEntre(inicio, hoje) / 7) + 1, total), total };
}

/** A parte do treino já corrida, de 0 a 1, contando hoje (a barra do `ActiveWorkoutCard`). */
export function progressoDoTreino(inicio: string, fim: string, hoje: string) {
  return entre(0, (diasEntre(inicio, hoje) + 1) / diasDoTreino(inicio, fim), 1);
}
