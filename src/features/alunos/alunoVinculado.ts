import { hojeDoAluno, progressoDoTreino, semanaDoTreino } from "@/lib/diaDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import { lerAlunoComConvite } from "./alunosComConvite";
import type { AlunoComConvite } from "./conviteDoAluno";
import { diaEMes, type StatusDoAluno } from "./listaDeAlunos";

/** O que o rodapé da tela do aluno pode oferecer. */
export type AcaoDoRodape = "editar" | "agendar" | "criar";

/**
 * As ações do rodapé (regras 68, 77 e 106). O treino agendado manda: sem "Criar treino" e sem
 * "Agendar novo treino", mesmo com pedido aberto. Depois vem o pedido, que pede um treino novo.
 */
export function acoesDoRodape(treinos: {
  ativo: boolean;
  agendado: boolean;
  pedido: boolean;
}): AcaoDoRodape[] {
  if (treinos.agendado) return treinos.ativo ? ["editar"] : [];
  if (treinos.pedido || !treinos.ativo) return ["criar"];
  return ["editar", "agendar"];
}

export type TreinoDoCartao = {
  nome: string;
  situacao: string;
  progresso: number;
  feitos: number;
  inicio: string;
  fim: string;
};

export type AlunoVinculado = {
  id: string;
  nome: string;
  status: StatusDoAluno;
  treino: TreinoDoCartao | null;
  agendado: boolean;
  acoes: AcaoDoRodape[];
};

export type TelaDoAluno =
  { tela: "convite"; dados: AlunoComConvite } | { tela: "vinculado"; dados: AlunoVinculado };

/** O fuso do aluno; sem conta, não há perfil para ler. */
async function lerFuso(contaId: string | null) {
  if (!contaId) return null;
  const perfil = await supabase.from("profiles").select("timezone").eq("id", contaId).maybeSingle();
  if (perfil.error) throw erroDaResposta(perfil.error);
  return perfil.data?.timezone ?? null;
}

async function contarTreinosFeitos(treinoId: string) {
  const feitos = await supabase
    .from("completions")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", treinoId);
  if (feitos.error) throw erroDaResposta(feitos.error);
  return feitos.count ?? 0;
}

/**
 * A tela de um aluno da Lista, escolhida pelo status do vínculo. Nula se o aluno não existe para
 * este professor (RLS), foi arquivado ou tem um convite que o professor não vê (regra 55).
 */
export async function lerTelaDoAluno(
  alunoId: string,
  agora = new Date(),
): Promise<TelaDoAluno | null> {
  const resposta = await supabase
    .from("teacher_student_list")
    .select(
      "student_id, user_id, name, link_status, list_status, current_workout_id, current_workout_name, current_start_date, current_end_date, current_concluded, scheduled_workout_id, has_open_request",
    )
    .eq("student_id", alunoId)
    .neq("link_status", "archived")
    .maybeSingle();
  if (resposta.error) throw erroDaResposta(resposta.error);
  const aluno = resposta.data;
  if (!aluno) return null;

  if (aluno.link_status === "invited") {
    const dados = await lerAlunoComConvite(alunoId, agora);
    return dados && { tela: "convite", dados };
  }

  const { current_workout_id: treinoId, current_start_date: inicio, current_end_date: fim } = aluno;
  const agendado = aluno.scheduled_workout_id !== null;
  let treino: TreinoDoCartao | null = null;
  if (treinoId && inicio && fim) {
    const [fuso, feitos] = await Promise.all([
      lerFuso(aluno.user_id),
      contarTreinosFeitos(treinoId),
    ]);
    const hoje = hojeDoAluno(fuso, agora);
    const semana = semanaDoTreino(inicio, fim, hoje);
    treino = {
      nome: aluno.current_workout_name ?? "",
      situacao: aluno.current_concluded
        ? "Treino concluído"
        : `Semana ${semana.atual} de ${semana.total}`,
      progresso: aluno.current_concluded ? 1 : progressoDoTreino(inicio, fim, hoje),
      feitos,
      inicio: diaEMes(inicio),
      fim: diaEMes(fim),
    };
  }
  return {
    tela: "vinculado",
    dados: {
      id: alunoId,
      nome: aluno.name ?? "",
      status: aluno.list_status as StatusDoAluno,
      treino,
      agendado,
      acoes: acoesDoRodape({
        ativo: treino !== null,
        agendado,
        pedido: aluno.has_open_request ?? false,
      }),
    },
  };
}
