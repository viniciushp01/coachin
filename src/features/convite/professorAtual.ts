import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";

/**
 * Nome do professor atual do aluno logado, para "Trocar de professor?" (regra 98). Lê só o que a
 * RLS do aluno já mostra: o próprio vínculo ativo e o perfil dos seus professores.
 */
export async function lerProfessorAtual(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const vinculo = await supabase
    .from("students")
    .select("teacher_id")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (vinculo.error) throw erroDaResposta(vinculo.error);
  if (!vinculo.data) return null;
  const professor = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", vinculo.data.teacher_id)
    .maybeSingle();
  if (professor.error) throw erroDaResposta(professor.error);
  return professor.data?.full_name ?? null;
}
