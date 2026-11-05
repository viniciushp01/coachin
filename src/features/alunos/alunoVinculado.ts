import { hojeDoAluno, progressoDoTreino, semanaDoTreino } from "@/lib/diaDoAluno";
import { erroDaResposta } from "@/lib/erros";
import { plural } from "@/lib/listas";
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
export async function lerFuso(contaId: string | null) {
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

  const convite = aluno.link_status === "invited";
  if (convite) {
    const dados = await lerAlunoComConvite(alunoId, agora);
    if (!dados) return null;
    // O treino montado antes do aceite aparece abaixo do convite (regras 122 e 153).
    const { cartao, agendado } = await lerCartaoDoTreino(aluno, agora, true);
    const acoes = acoesDoRodape({ ativo: cartao !== null, agendado, pedido: false });
    return { tela: "convite", dados: { ...dados, treino: { cartao, agendado, acoes } } };
  }

  const { cartao: treino, agendado } = await lerCartaoDoTreino(aluno, agora, false);
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

type LinhaDoTreino = {
  user_id: string | null;
  current_workout_id: string | null;
  current_workout_name: string | null;
  current_start_date: string | null;
  current_end_date: string | null;
  current_concluded: boolean | null;
  scheduled_workout_id: string | null;
};

/**
 * O cartão do treino ativo e se há um agendado. Antes do aceite não há conta, então não há fuso
 * (vale São Paulo, regra 122) nem treino feito (marcação só depois do aceite, regra 79).
 */
async function lerCartaoDoTreino(aluno: LinhaDoTreino, agora: Date, semConta: boolean) {
  const { current_workout_id: treinoId, current_start_date: inicio, current_end_date: fim } = aluno;
  const agendado = aluno.scheduled_workout_id !== null;
  let cartao: TreinoDoCartao | null = null;
  if (treinoId && inicio && fim) {
    const [fuso, feitos] = await Promise.all([
      lerFuso(aluno.user_id),
      semConta ? 0 : contarTreinosFeitos(treinoId),
    ]);
    const hoje = hojeDoAluno(fuso, agora);
    const semana = semanaDoTreino(inicio, fim, hoje);
    cartao = {
      nome: aluno.current_workout_name ?? "",
      situacao: semConta
        ? plural(semana.total, "semana", "semanas")
        : aluno.current_concluded
          ? "Treino concluído"
          : `Semana ${semana.atual} de ${semana.total}`,
      progresso: semConta ? 0 : aluno.current_concluded ? 1 : progressoDoTreino(inicio, fim, hoje),
      feitos,
      inicio: diaEMes(inicio),
      fim: diaEMes(fim),
    };
  }
  return { cartao, agendado };
}
