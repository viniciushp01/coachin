import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import {
  CHIP_DO_ESTADO,
  COLUNAS_DO_CONVITE,
  estadoDoConvite,
  estadoVisivel,
  textoDaRecusa,
  type AlunoComConvite,
} from "./conviteDoAluno";

/**
 * Um aluno que ainda não ativou o acesso, com o convite mais recente dele. Nulo se o aluno não
 * existe para este professor (RLS), já ativou o acesso (aí a tela é a do aluno, fatias 3 e 7) ou
 * o convite não está num estado que o professor vê (regra 55).
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
  if (!convite.data || !estadoVisivel(estadoDoConvite(convite.data, agora))) return null;
  return {
    aluno: { id: aluno.data.id, nome: aluno.data.name, email: aluno.data.email },
    convite: convite.data,
  };
}

export type LinhaProvisoria = { id: string; nome: string; detalhe: string };

/**
 * Lista provisória dos alunos com convite, em ordem alfabética, até a Lista de alunos da fatia 3
 * (regras 55, 59 e 102). Serve para chegar à tela do aluno com convite.
 */
export async function lerAlunosComConvite(agora = new Date()): Promise<LinhaProvisoria[]> {
  const [alunos, convites] = await Promise.all([
    supabase.from("students").select("id, name").eq("status", "invited").order("name"),
    supabase
      .from("invites")
      .select(`student_id, ${COLUNAS_DO_CONVITE}`)
      .eq("kind", "student")
      .order("created_at", { ascending: false }),
  ]);
  if (alunos.error) throw erroDaResposta(alunos.error);
  if (convites.error) throw erroDaResposta(convites.error);
  const maisRecente = new Map<string, (typeof convites.data)[number]>();
  for (const c of convites.data) {
    if (c.student_id && !maisRecente.has(c.student_id)) maisRecente.set(c.student_id, c);
  }
  return alunos.data.flatMap((a) => {
    const convite = maisRecente.get(a.id);
    const estado = convite && estadoDoConvite(convite, agora);
    if (!convite || !estado || !estadoVisivel(estado)) return [];
    const detalhe = estado === "recusado" ? textoDaRecusa(convite) : CHIP_DO_ESTADO[estado].texto;
    return [{ id: a.id, nome: a.name, detalhe }];
  });
}
