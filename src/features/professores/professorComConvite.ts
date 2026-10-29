import {
  COLUNAS_DO_CONVITE,
  estadoDoConvite,
  estadoVisivel,
} from "@/features/alunos/conviteDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import type { ProfessorComConvite } from "./ProfessorComConvitePage";

/**
 * Um convite de professor com a pessoa convidada. Nulo se não existe, não é de professor ou não
 * está pendente, expirado nem recusado (usado e substituído não abrem tela).
 */
export async function lerProfessorComConvite(
  conviteId: string,
  agora = new Date(),
): Promise<ProfessorComConvite | null> {
  const { data, error } = await supabase
    .from("invites")
    .select(`${COLUNAS_DO_CONVITE}, email, invitee_name`)
    .eq("id", conviteId)
    .eq("kind", "teacher")
    .maybeSingle();
  if (error) throw erroDaResposta(error);
  if (!data?.email || !estadoVisivel(estadoDoConvite(data, agora))) return null;
  return {
    professor: { nome: data.invitee_name ?? data.email, email: data.email },
    convite: data,
  };
}
