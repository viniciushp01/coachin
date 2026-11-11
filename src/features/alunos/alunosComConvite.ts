import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import {
  COLUNAS_DO_CONVITE,
  estadoDoConvite,
  estadoVisivel,
  type AlunoComConvite,
} from "./conviteDoAluno";

/**
 * Um aluno que ainda não ativou o acesso, com o convite mais recente dele. Nulo se o aluno não
 * existe para este professor (RLS), já ativou o acesso (aí a tela é a do aluno, fatias 3 e 7) ou
 * o convite não está num estado que o professor vê (regra 55). Sem convite, `convite` é nulo.
 */
export async function lerAlunoComConvite(
  alunoId: string,
  agora = new Date(),
): Promise<AlunoComConvite | null> {
  const aluno = await supabase
    .from("students")
    .select("id, name, email, status")
    .eq("id", alunoId)
    .maybeSingle();
  if (aluno.error) throw erroDaResposta(aluno.error);
  if (!aluno.data || aluno.data.status !== "invited") return null;
  const convite = await supabase
    .from("invites")
    .select(COLUNAS_DO_CONVITE)
    .eq("student_id", alunoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (convite.error) throw erroDaResposta(convite.error);
  // Sem nenhum convite: cadastrado e ainda não convidado (regra 164).
  if (convite.data && !estadoVisivel(estadoDoConvite(convite.data, agora))) return null;
  return {
    aluno: { id: aluno.data.id, nome: aluno.data.name, email: aluno.data.email },
    convite: convite.data,
  };
}
