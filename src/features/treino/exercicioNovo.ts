import { rpc } from "@/lib/rpc";
import type { ExercicioDaBusca } from "./biblioteca";
import type { Medida } from "./medida";

/** `exercises.load_mode`: "Sim", "Opcional" e "Não" (regra 123). */
export type ModoDeCarga = "required" | "optional" | "none";

const SEU_EXERCICIO = "Seu exercício";

/** O mais parecido com o nome (regra 74: olha nome e apelido); `null` se não houver. */
export async function procurarParecido(nome: string): Promise<ExercicioDaBusca | null> {
  const [parecido] = await rpc("similar_exercises", { p_name: nome });
  if (!parecido) return null;
  return {
    id: parecido.id,
    nome: parecido.name,
    medida: parecido.measure as Medida,
    detalhe: parecido.owner_id ? SEU_EXERCICIO : (parecido.muscle_group ?? ""),
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
    detalhe: SEU_EXERCICIO,
  };
}
