import { erroDaResposta } from "./erros";
import { supabase } from "./supabase";

/** O vínculo ativo do aluno logado: o cadastro feito pelo professor e o nome dele. */
export type VinculoAtivo = {
  /** Nome no cadastro do professor (vem preenchido no perfil, regra 49). */
  nome: string;
  /** Telefone do cadastro, se o professor informou (regra 109). */
  telefone: string | null;
  professor: string;
};

/**
 * Lê só o que a RLS do aluno já mostra: o próprio vínculo ativo e o perfil dos seus professores.
 * Nulo quando não há vínculo ativo.
 */
export async function lerVinculoAtivo(): Promise<VinculoAtivo | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const vinculo = await supabase
    .from("students")
    .select("name, phone, teacher_id")
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
  return {
    nome: vinculo.data.name,
    telefone: vinculo.data.phone,
    professor: professor.data?.full_name ?? "",
  };
}

/** Nome do professor atual, para "Trocar de professor?" (regra 98). */
export async function lerProfessorAtual(): Promise<string | null> {
  return (await lerVinculoAtivo())?.professor ?? null;
}
