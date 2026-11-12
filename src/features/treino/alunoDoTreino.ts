import { acoesDoRodape, lerFuso } from "@/features/alunos/alunoVinculado";
import { conviteDaLista, type SemAcesso } from "@/features/alunos/conviteDoAluno";
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
  /** Estado do convite de quem ainda não aceitou (regras 122 e 153); nulo se já tem acesso. */
  convite: SemAcesso | null;
  /** E-mail do cadastro: decide o "Convite gerado" depois de "Enviar convite agora" (regra 164). */
  email?: string | null;
  /** Havia pedido aberto ao entrar: só então o cancelamento vira aviso na montagem (regra 103). */
  pedidoAberto?: boolean;
};

/**
 * O aluno para quem se monta o treino. Nulo se o rodapé da tela dele não oferece "Criar treino"
 * (regras 68, 77 e 106); aluno com convite também (regra 122).
 */
export async function lerAlunoDoTreino(
  alunoId: string,
  agora = new Date(),
): Promise<AlunoDoTreino | null> {
  const resposta = await supabase
    .from("teacher_student_list")
    .select(
      "user_id, name, email, link_status, list_status, current_workout_id, scheduled_workout_id, has_open_request",
    )
    .eq("student_id", alunoId)
    .neq("link_status", "archived")
    .maybeSingle();
  if (resposta.error) throw erroDaResposta(resposta.error);
  const aluno = resposta.data;
  if (!aluno) return null;

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
    convite: aluno.link_status === "invited" ? conviteDaLista(aluno.list_status) : null,
    email: aluno.email,
    pedidoAberto: aluno.has_open_request ?? false,
  };
}

/**
 * Relido durante a montagem (regra 103): o pedido que estava aberto ao entrar foi cancelado? Se
 * sim, devolve o telefone para o link do WhatsApp (o do perfil; sem ele, o do cadastro, regra
 * 108). Nulo se o pedido segue aberto ou já foi atendido.
 */
export async function lerPedidoCancelado(
  alunoId: string,
): Promise<{ telefone: string | null } | null> {
  const ultimo = await supabase
    .from("training_requests")
    .select("status")
    .eq("student_id", alunoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimo.error) throw erroDaResposta(ultimo.error);
  if (ultimo.data?.status !== "canceled") return null;

  const vinculo = await supabase
    .from("teacher_student_list")
    .select("user_id, phone")
    .eq("student_id", alunoId)
    .maybeSingle();
  if (vinculo.error) throw erroDaResposta(vinculo.error);
  let telefone = vinculo.data?.phone ?? null;
  if (vinculo.data?.user_id) {
    const perfil = await supabase
      .from("student_profiles")
      .select("phone")
      .eq("user_id", vinculo.data.user_id)
      .maybeSingle();
    if (perfil.error) throw erroDaResposta(perfil.error);
    telefone = perfil.data?.phone ?? telefone;
  }
  return { telefone };
}
