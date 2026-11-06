// O rascunho da montagem do treino: nada vai ao banco antes de "Salvar treino" (regra 107); na
// criação, também fica guardado no aparelho (regra 162, `rascunhoGuardado.ts`). Sem tela e sem
// banco: cada operação devolve um rascunho novo. Datas em "aaaa-mm-dd".
import { z } from "zod";
import { MENSAGENS } from "@/lib/erros";
import { plural } from "@/lib/listas";
import type { EstadoVisivel } from "@/features/alunos/conviteDoAluno";
import { formatarData } from "@/ui/datas";
import type { Medida } from "./medida";

export type ExercicioDoRascunho = {
  /** Id só da tela: o mesmo exercício do catálogo pode entrar duas vezes na ficha. */
  id: string;
  exercicioId: string;
  nome: string;
  medida: Medida;
  series: number;
  /** Como digitado (regra 124). */
  reps: string;
  /** Em segundos; 0 é sem descanso. */
  descanso: number;
  observacao: string;
};

export type Ficha = {
  id: string;
  /** Só na ficha que já está no banco: `id` é o dela, e a letra não muda (regra 111). */
  letra?: string;
  nome: string;
  exercicios: ExercicioDoRascunho[];
};

export type Rascunho = {
  nome: string;
  inicio: string;
  semanas: number;
  frequencia: string;
  /** `letters_used`: a próxima ficha nova parte daqui, e letra removida não volta (regra 111). */
  letrasUsadas: number;
  fichas: Ficha[];
};

export const SEMANAS_MAX = 104;

/** Limites de `save_workout` (migration 0012). */
const SERIES_MAX = 20;
const REPS_MAX_CARACTERES = 20;
const DESCANSO_MAX = 600;

// Com a hora: um rascunho guardado no aparelho volta depois de recarregar, quando a conta recomeça.
let ultimoId = 0;
const novoId = () => `local-${Date.now().toString(36)}-${++ultimoId}`;

/** Sem regra para o padrão de semanas: 8 é o valor de todas as telas de Dados no Figma. */
export function criarRascunho(hoje: string): Rascunho {
  return { nome: "", inicio: hoje, semanas: 8, frequencia: "", letrasUsadas: 0, fichas: [] };
}

// Fim e aviso ---------------------------------------------------------------------------------

/** Início + 7 × semanas − 1 dia (regra 73). */
export function fimDoTreino(inicio: string, semanas: number) {
  const fim = new Date(`${inicio}T00:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + 7 * semanas - 1);
  return fim.toISOString().slice(0, 10);
}

/** "dd/mm" de uma data. */
export const diaEMes = (data: string) => formatarData(data).slice(0, 5);

/** O texto sob "Termina em…" em Dados (regras 75 e 150 (1)). */
export function avisoDoInicio({
  inicio,
  hoje,
  semanas,
  temTreinoAtual,
}: {
  inicio: string;
  hoje: string;
  semanas: number;
  temTreinoAtual: boolean;
}) {
  if (inicio > hoje) {
    return `Fica agendado. Só você vê até ${diaEMes(inicio)}, e pode alterar ou cancelar antes.`;
  }
  const dura = `O treino dura ${plural(semanas, "semana", "semanas")} a partir do início.`;
  return temTreinoAtual
    ? `${dura} Fica ativo hoje e o anterior vai para o Histórico.`
    : `${dura} Fica ativo hoje.`;
}

/** O aviso extra de Dados para quem ainda não aceitou o convite (regra 153 (2)): só com início hoje. */
export function avisoDoConvite({
  convite,
  nome,
  inicio,
  hoje,
}: {
  convite: EstadoVisivel | null;
  nome: string;
  inicio: string;
  hoje: string;
}): { titulo: string; texto: string } | null {
  if (!convite || inicio > hoje) return null;
  return convite === "recusado"
    ? {
        titulo: `${nome} recusou o convite`,
        texto: "O treino fica guardado até um novo convite ser aceito.",
      }
    : {
        titulo: `${nome} ainda não aceitou o convite`,
        texto: "O treino começa a contar na data de início, mesmo antes do aceite.",
      };
}

// Letras --------------------------------------------------------------------------------------

/**
 * A letra da posição, igual a `private.letter_for` no banco: A…Z, AA, AB… Até o primeiro
 * salvamento, a letra acompanha a posição (regra 149 (3)).
 */
export function letraDaFicha(indice: number) {
  let letra = "";
  for (let n = indice; n >= 0; n = Math.floor(n / 26) - 1) {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
  }
  return letra;
}

/** As letras na ordem das fichas, iguais às que `save_workout` vai dar. */
export function letrasDasFichas({
  fichas,
  letrasUsadas,
}: Pick<Rascunho, "fichas" | "letrasUsadas">) {
  let proxima = letrasUsadas;
  return fichas.map((ficha) => ficha.letra ?? letraDaFicha(proxima++));
}

/** A letra da ficha aberta; a nova ainda fora do rascunho entra depois da última. */
export function letraDaFichaAberta(r: Pick<Rascunho, "fichas" | "letrasUsadas">, ficha: Ficha) {
  const posicao = r.fichas.findIndex((f) => f.id === ficha.id);
  if (posicao >= 0) return letrasDasFichas(r)[posicao]!;
  return letrasDasFichas({ ...r, fichas: [...r.fichas, ficha] }).at(-1)!;
}

/** "Ficha A · Peito e tríceps"; ainda sem nome, "Ficha A". */
export function tituloDaFicha(ficha: Pick<Ficha, "nome">, letra: string) {
  const nome = ficha.nome.trim();
  return nome ? `Ficha ${letra} · ${nome}` : `Ficha ${letra}`;
}

// Fichas e exercícios -------------------------------------------------------------------------

/** A ficha aberta por "Adicionar ficha": só entra no rascunho em "Salvar ficha" (regra 156 (2)). */
export function novaFicha(): Ficha {
  return { id: novoId(), nome: "", exercicios: [] };
}

/** Troca a ficha de mesmo id; sem ela no rascunho, entra no fim. */
export function salvarFicha(r: Rascunho, ficha: Ficha): Rascunho {
  const existe = r.fichas.some((f) => f.id === ficha.id);
  return {
    ...r,
    fichas: existe ? r.fichas.map((f) => (f.id === ficha.id ? ficha : f)) : [...r.fichas, ficha],
  };
}

export function removerFicha(r: Rascunho, fichaId: string): Rascunho {
  return { ...r, fichas: r.fichas.filter((f) => f.id !== fichaId) };
}

/** A ordem da lista é a ordem de `save_workout`; a letra acompanha a posição (regra 149 (3)). */
export function reordenarFichas(r: Rascunho, fichas: Ficha[]): Rascunho {
  return { ...r, fichas };
}

export function reordenarExercicios(ficha: Ficha, exercicios: ExercicioDoRascunho[]): Ficha {
  return { ...ficha, exercicios };
}

export type ValoresDoExercicio = Pick<
  ExercicioDoRascunho,
  "series" | "reps" | "descanso" | "observacao"
>;

export function novoExercicio(
  catalogo: { id: string; nome: string; medida: Medida },
  valores: ValoresDoExercicio,
): ExercicioDoRascunho {
  return {
    id: novoId(),
    exercicioId: catalogo.id,
    nome: catalogo.nome,
    medida: catalogo.medida,
    ...valores,
  };
}

/** Troca o exercício de mesmo id; sem ele na ficha, entra no fim. */
export function salvarExercicio(ficha: Ficha, exercicio: ExercicioDoRascunho): Ficha {
  const existe = ficha.exercicios.some((e) => e.id === exercicio.id);
  return {
    ...ficha,
    exercicios: existe
      ? ficha.exercicios.map((e) => (e.id === exercicio.id ? exercicio : e))
      : [...ficha.exercicios, exercicio],
  };
}

export function removerExercicio(ficha: Ficha, exercicioId: string): Ficha {
  return { ...ficha, exercicios: ficha.exercicios.filter((e) => e.id !== exercicioId) };
}

/** O exercício foi ajustado na biblioteca (regra 123): as repetições digitadas ficam como estão. */
export function fichaComMedida(ficha: Ficha, exercicioId: string, medida: Medida): Ficha {
  return {
    ...ficha,
    exercicios: ficha.exercicios.map((e) => (e.exercicioId === exercicioId ? { ...e, medida } : e)),
  };
}

export function rascunhoComMedida(r: Rascunho, exercicioId: string, medida: Medida): Rascunho {
  return { ...r, fichas: r.fichas.map((f) => fichaComMedida(f, exercicioId, medida)) };
}

/** Houve alteração em relação a `original`? (regra 107) */
export function mudou<T>(original: T, atual: T) {
  return JSON.stringify(original) !== JSON.stringify(atual);
}

/** A ficha aberta difere da salva no rascunho ou, se é nova, de uma ficha vazia? (regra 107) */
export function fichaMudou(r: Pick<Rascunho, "fichas">, ficha: Ficha) {
  const salva = r.fichas.find((f) => f.id === ficha.id);
  return mudou(salva ?? { ...ficha, nome: "", exercicios: [] }, ficha);
}

// Validação -----------------------------------------------------------------------------------

/** Erros de Dados ao tocar em "Continuar" (regras 105 e 154). */
export function validarDados({ nome, semanas }: Pick<Rascunho, "nome" | "semanas">) {
  const erros: { nome?: string; semanas?: string } = {};
  if (!nome.trim()) erros.nome = MENSAGENS.workout_name_required;
  if (semanas < 1 || semanas > SEMANAS_MAX) erros.semanas = MENSAGENS.weeks_invalid;
  return erros;
}

/** Erros de Editar ficha ao tocar em "Salvar ficha" (regra 104). O banco exige o nome. */
export function validarFicha(ficha: Ficha) {
  const erros: { nome?: string; semExercicio?: boolean } = {};
  if (!ficha.nome.trim()) erros.nome = MENSAGENS.day_name_required;
  if (ficha.exercicios.length === 0) erros.semExercicio = true;
  return erros;
}

export type ErroDoTreino =
  | { tipo: "sem_ficha" }
  /** `letra` é a da primeira; `fichas`, todas as que mostram "Sem exercícios". */
  | { tipo: "ficha_sem_exercicio"; letra: string; fichas: string[] };

/** O erro de "Salvar treino" (regra 104); nulo se pode salvar. */
export function validarTreino(r: Pick<Rascunho, "fichas" | "letrasUsadas">): ErroDoTreino | null {
  const { fichas } = r;
  if (fichas.length === 0) return { tipo: "sem_ficha" };
  const primeira = fichas.findIndex((f) => f.exercicios.length === 0);
  if (primeira < 0) return null;
  return {
    tipo: "ficha_sem_exercicio",
    letra: letrasDasFichas(r)[primeira]!,
    fichas: fichas.filter((f) => f.exercicios.length === 0).map((f) => f.id),
  };
}

/**
 * Os campos da folha "Editar exercício" → valores do rascunho (regras 124, 149 (4) e 159). O que
 * grava não mudou: número fixo "10", faixa "8-12" ("30-45 s" em exercício de tempo) ou o texto
 * livre como digitado. Os erros de limite de repetições e de descanso não têm texto próprio na
 * regra: usam os de `save_workout`.
 */
export function esquemaDoExercicio(medida: Medida) {
  const tempo = medida === "time";
  return z
    .object({
      series: z.string(),
      modo: z.enum(["fixo", "faixa", "outro"]),
      reps: z.string(),
      repsMax: z.string(),
      descanso: z.string(),
      observacao: z.string(),
    })
    .transform((v, ctx): ValoresDoExercicio => {
      const erro = (campo: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [campo], message });

      const series = v.series.trim();
      const numeroDeSeries = Number(series);
      if (!/^\d{1,2}$/.test(series) || numeroDeSeries < 1 || numeroDeSeries > SERIES_MAX) {
        erro("series", "Digite o número de séries (de 1 a 20).");
      }

      let reps = v.reps.trim();
      if (v.modo === "outro") {
        if (!reps) erro("reps", tempo ? "Digite o tempo." : "Digite as repetições.");
        else if (reps.length > REPS_MAX_CARACTERES) erro("reps", MENSAGENS.reps_invalid);
      } else {
        const minimo = /^\d+$/.test(reps) ? Number(reps) : NaN;
        reps = String(minimo);
        if (Number.isNaN(minimo)) erro("reps", tempo ? "Digite o tempo." : "Digite as repetições.");
        else if (v.modo === "faixa") {
          const maximo = /^\d+$/.test(v.repsMax.trim()) ? Number(v.repsMax.trim()) : NaN;
          if (!(maximo > minimo)) erro("reps", "O máximo precisa ser maior que o mínimo.");
          else reps = `${minimo}-${maximo}${tempo ? " s" : ""}`;
        }
      }

      const descansoLido = /^(\d{1,3})\s*s?$/i.exec(v.descanso.trim());
      const descanso = v.descanso.trim() ? Number(descansoLido?.[1] ?? NaN) : 0;
      if (!(descanso <= DESCANSO_MAX)) erro("descanso", MENSAGENS.rest_invalid);

      return { series: numeroDeSeries, reps, descanso, observacao: v.observacao.trim() };
    });
}

// Saída ---------------------------------------------------------------------------------------

/** O `p_data` de `save_workout`; a ordem das listas é a ordem no banco. */
export function paraSaveWorkout(r: Rascunho) {
  return {
    name: r.nome.trim(),
    start_date: r.inicio,
    weeks: r.semanas,
    suggested_frequency: r.frequencia.trim() || null,
    days: r.fichas.map((ficha) => ({
      id: ficha.letra ? ficha.id : null,
      name: ficha.nome.trim(),
      exercises: ficha.exercicios.map((e) => ({
        exercise_id: e.exercicioId,
        sets: e.series,
        reps: e.reps,
        rest_seconds: e.descanso,
        note: e.observacao || null,
      })),
    })),
  };
}
