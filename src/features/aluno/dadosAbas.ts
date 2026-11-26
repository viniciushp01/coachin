import {
  calendarioDe,
  historicoDeCargasDe,
  historicoDeTreinosDe,
  lerAlunoLogado,
  perfilDe,
  progressaoDe,
  type AlunoAcompanhado,
  type CargaDoExercicio,
  type DadosDoCalendario,
  type PerfilDoAluno,
  type TreinoAnterior,
} from "@/features/acompanhar/dados";
import { ErroApp } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { sair } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";
import { lerProfessorAtual } from "@/lib/vinculo";
import { lerTreinoParaExibir, type DadosDoAluno } from "./dados";
import type { Registro } from "./evolucao";

// Leituras das abas do aluno (fatia 6). Reaproveitam as do professor acompanhando
// (`features/acompanhar/dados`), trocando a fonte: aqui o aluno lê o que é dele, por `auth.uid`.
// Só `select`: a RLS do aluno já cobre vínculo, treinos, marcações, cargas, histórico e perfil.

async function alunoLogado() {
  const aluno = await lerAlunoLogado();
  if (!aluno) throw new ErroApp("not_authenticated");
  return aluno;
}

// ---------------------------------------------------------------- Frequência

export type DadosDaFrequencia = {
  aluno: AlunoAcompanhado | null;
  /** O treino ativo (com a fila local aplicada): é ele que o painel do dia edita. */
  inicio: DadosDoAluno;
  /** Todos os treinos e marcações; nulo sem conexão (vale o treino guardado, regra 116). */
  calendario: DadosDoCalendario | null;
};

export async function lerFrequenciaDoAluno(): Promise<DadosDaFrequencia> {
  const inicio = await lerTreinoParaExibir();
  if (inicio.offline) return { aluno: null, inicio, calendario: null };
  try {
    const aluno = await alunoLogado();
    return { aluno, inicio, calendario: await calendarioDe(aluno) };
  } catch (erro) {
    if (erro instanceof ErroApp && erro.codigo === "sem_conexao") {
      return { aluno: null, inicio, calendario: null };
    }
    throw erro;
  }
}

// ---------------------------------------------------------------- Progressão

export async function lerProgressaoDoAluno(): Promise<CargaDoExercicio[]> {
  return (await progressaoDe(await alunoLogado())).exercicios;
}

export type EvolucaoDoExercicio = {
  hoje: string;
  nome: string;
  /** Em ordem cronológica: é o que o gráfico e o selo leem. */
  registros: Registro[];
};

/**
 * O histórico de cargas de um exercício, em ordem cronológica (do mais antigo ao mais novo).
 * A tela mostra a lista do mais novo para o mais antigo (inverte). Nulo se o aluno não tem carga
 * nele (regras 44 e 123).
 */
export async function lerEvolucaoDoExercicio(
  exercicioId: string,
): Promise<EvolucaoDoExercicio | null> {
  const aluno = await alunoLogado();
  const dados = await historicoDeCargasDe(aluno, exercicioId);
  if (!dados) return null;
  const registros = [...dados.historico].reverse().map((h) => ({ dia: h.dia, kg: h.kg }));
  return {
    hoje: aluno.hoje,
    nome: dados.exercicio.nome,
    // Carga registrada antes do histórico existir: ao menos a atual.
    registros:
      registros.length > 0 ? registros : [{ dia: dados.exercicio.dia, kg: dados.exercicio.kg }],
  };
}

// ---------------------------------------------------------------- Histórico

export async function lerHistoricoDoAluno(): Promise<TreinoAnterior[]> {
  return (await historicoDeTreinosDe(await alunoLogado())).treinos;
}

// ---------------------------------------------------------------- Perfil

export type PerfilDaConta = {
  perfil: PerfilDoAluno;
  professor: string | null;
  email: string;
};

export async function lerPerfilDoAluno(): Promise<PerfilDaConta> {
  const aluno = await alunoLogado();
  const [perfil, professor, sessao] = await Promise.all([
    perfilDe(aluno),
    lerProfessorAtual(),
    supabase.auth.getSession(),
  ]);
  return { perfil, professor, email: sessao.data.session?.user.email ?? "" };
}

// ---------------------------------------------------------------- Excluir a conta

/**
 * Exclui a própria conta (regra 120): o banco apaga a conta e tudo que é dela, e em seguida o app
 * encerra a sessão. Exige conexão (regra 116): sem ela `rpc` lança `sem_conexao` e nada muda.
 */
export async function excluirMinhaConta() {
  await rpc("delete_my_account");
  await sair();
}
