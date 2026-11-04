import { acoesDoRodape, lerFuso } from "@/features/alunos/alunoVinculado";
import { hojeDoAluno } from "@/lib/diaDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";

export type AlunoDoTreino = {
  id: string;
  nome: string;
  /** Hoje no fuso do aluno: o mínimo do início do treino (regras 3 e 115). */
  hoje: string;
  /** Lido antes de salvar: decide os textos do "anterior" (regra 150 (1)). */
  temTreinoAtual: boolean;
};

/**
 * O aluno para quem se monta o treino. Nulo se o rodapé da tela dele não oferece "Criar treino"
 * (regras 68, 77 e 106); aluno com convite é o #98.
 */
export async function lerAlunoDoTreino(
  alunoId: string,
  agora = new Date(),
): Promise<AlunoDoTreino | null> {
  const resposta = await supabase
    .from("teacher_student_list")
    .select(
      "user_id, name, link_status, current_workout_id, scheduled_workout_id, has_open_request",
    )
    .eq("student_id", alunoId)
    .neq("link_status", "archived")
    .maybeSingle();
  if (resposta.error) throw erroDaResposta(resposta.error);
  const aluno = resposta.data;
  if (!aluno || aluno.link_status === "invited") return null;

  const temTreinoAtual = aluno.current_workout_id !== null;
  const acoes = acoesDoRodape({
    ativo: temTreinoAtual,
    agendado: aluno.scheduled_workout_id !== null,
    pedido: aluno.has_open_request ?? false,
  });
  if (!acoes.includes("criar")) return null;

  return {
    id: alunoId,
    nome: aluno.name ?? "",
    hoje: hojeDoAluno(await lerFuso(aluno.user_id), agora),
    temTreinoAtual,
  };
}
