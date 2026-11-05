import { rpc } from "@/lib/rpc";
import type { ExercicioDaBusca } from "./biblioteca";
import type { Medida } from "./medida";

/** `exercises.load_mode`: "Sim", "Opcional" e "Não" (regra 123). */
export type ModoDeCarga = "required" | "optional" | "none";

const SEU_EXERCICIO = "Seu exercício";

export type ExercicioParecido = ExercicioDaBusca & {
  /** Nome igual ao digitado: o servidor recusaria criar (regra 157 (9)); apelido igual não conta. */
  mesmoNome: boolean;
};

/**
 * O mesmo que `private.normalize_name` faz no banco. Se divergir num caractere raro, só cai no aviso
 * normal, e "Criar exercício" recebe `exercise_exists`.
 */
function normalizarNome(nome: string) {
  return nome.trim().replace(/\s+/g, " ").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** O primeiro do aviso (regra 157 (6): nome igual, apelido igual, similaridade); `null` se não houver. */
export async function procurarParecido(nome: string): Promise<ExercicioParecido | null> {
  const [parecido] = await rpc("similar_exercises", { p_name: nome });
  if (!parecido) return null;
  return {
    id: parecido.id,
    nome: parecido.name,
    medida: parecido.measure as Medida,
    carga: parecido.load_mode as ModoDeCarga,
    proprio: parecido.owner_id !== null,
    detalhe: parecido.owner_id ? SEU_EXERCICIO : (parecido.muscle_group ?? ""),
    mesmoNome: parecido.name_normalized === normalizarNome(nome),
  };
}

/** Cria sem grupo muscular (regra 151 (2)); o resultado volta como "Seu exercício". */
export async function criarExercicio(novo: {
  nome: string;
  medida: Medida;
  carga: ModoDeCarga;
}): Promise<ExercicioDaBusca> {
  const criado = await rpc("create_exercise", {
    p_name: novo.nome,
    p_measure: novo.medida,
    p_load_mode: novo.carga,
  });
  return {
    id: criado.id,
    nome: criado.name,
    medida: criado.measure as Medida,
    carga: criado.load_mode as ModoDeCarga,
    proprio: true,
    detalhe: SEU_EXERCICIO,
  };
}
