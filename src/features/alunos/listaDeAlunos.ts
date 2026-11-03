import type { Database } from "@db/database.types";
import { erroDaResposta } from "@/lib/erros";
import { emOrdemAlfabetica, plural, resumoDaBusca } from "@/lib/listas";
import { supabase } from "@/lib/supabase";
import type { TomChip } from "@/ui";
import { CHIP_DO_ESTADO, dataCurta, textoDaRecusa } from "./conviteDoAluno";

type LinhaDaView = Database["public"]["Views"]["teacher_student_list"]["Row"];

const COLUNAS_DA_VIEW =
  "student_id, name, list_status, invite_id, invite_expires_at, invite_declined_at";
export type AlunoDaLista = Pick<
  LinhaDaView,
  "student_id" | "name" | "invite_id" | "invite_expires_at" | "invite_declined_at"
> & { list_status: StatusDoAluno };

/** Data de envio do convite, lida direto de `invites` (a view não a traz). */
export type EnvioDoConvite = { id: string; created_at: string };

/** Os seis status da lista, como a view `teacher_student_list` os calcula (regras 34, 55 e 102). */
export type StatusDoAluno =
  | "ativo"
  | "sem_treino"
  | "quase_no_fim"
  | "convite_pendente"
  | "convite_expirado"
  | "convite_recusado";

export type LinhaDoAluno = {
  /** Id do vínculo (`students.id`). */
  id: string;
  nome: string;
  status: StatusDoAluno;
  /** Linha de detalhe; por ora só a do convite (a do aluno vinculado vem em #77). */
  detalhe: string | undefined;
  /** Só a linha com convite abre tela; a do aluno vinculado espera a fatia 7 (regra 147 (4)). */
  abre: boolean;
};

/** Chip de cada status (design.md, `Chip`). */
export const CHIP_DO_ALUNO: Record<StatusDoAluno, { tom: TomChip; texto: string }> = {
  ativo: { tom: "success", texto: "Ativo" },
  sem_treino: { tom: "neutral", texto: "Sem treino" },
  quase_no_fim: { tom: "warning", texto: "Quase no fim" },
  convite_pendente: CHIP_DO_ESTADO.pendente,
  convite_expirado: CHIP_DO_ESTADO.expirado,
  convite_recusado: CHIP_DO_ESTADO.recusado,
};

/**
 * Detalhe do aluno com convite (Figma "Professor · Alunos", seções 1 e 6): as datas do convite,
 * mesmo com treino criado (regras 122 e 147 (1)).
 */
function detalheDoConvite(aluno: AlunoDaLista, enviadoEm: string | undefined) {
  switch (aluno.list_status) {
    case "convite_pendente": {
      const validade = aluno.invite_expires_at
        ? `vale até ${dataCurta(aluno.invite_expires_at)}`
        : "";
      return [enviadoEm && `Convite enviado em ${dataCurta(enviadoEm)}`, validade]
        .filter(Boolean)
        .join(" · ");
    }
    case "convite_expirado":
      return aluno.invite_expires_at
        ? `Convite expirou em ${dataCurta(aluno.invite_expires_at)}`
        : "Convite expirado";
    case "convite_recusado":
      return textoDaRecusa({ declined_at: aluno.invite_declined_at });
    default:
      return undefined;
  }
}

/** Uma linha da Lista de alunos (regras 55, 102, 114, 122 e 147). */
export function linhaDoAluno(aluno: AlunoDaLista, conviteEnviadoEm?: string): LinhaDoAluno {
  const detalhe = detalheDoConvite(aluno, conviteEnviadoEm);
  return {
    id: aluno.student_id ?? "",
    nome: aluno.name ?? "",
    status: aluno.list_status,
    detalhe,
    abre: detalhe !== undefined,
  };
}

/** As linhas da lista, em ordem alfabética pt-BR (regra 59). */
export function montarLista(alunos: AlunoDaLista[], envios: EnvioDoConvite[]): LinhaDoAluno[] {
  const enviadoEm = new Map(envios.map((c) => [c.id, c.created_at]));
  return emOrdemAlfabetica(
    alunos.map((a) => linhaDoAluno(a, a.invite_id ? enviadoEm.get(a.invite_id) : undefined)),
  );
}

/** "1 aluno", "6 alunos", contando os alunos com convite; durante a busca, "N resultados". */
export function resumoDaLista(linhas: LinhaDoAluno[], termo = "") {
  return resumoDaBusca(linhas, termo) ?? plural(linhas.length, "aluno", "alunos");
}

/**
 * Lê a lista com a RLS do professor (só os alunos dele). Aluno arquivado (trocou de professor)
 * não aparece.
 */
export async function lerAlunos(): Promise<LinhaDoAluno[]> {
  const [alunos, convites] = await Promise.all([
    supabase.from("teacher_student_list").select(COLUNAS_DA_VIEW).neq("link_status", "archived"),
    supabase.from("invites").select("id, created_at").eq("kind", "student"),
  ]);
  if (alunos.error) throw erroDaResposta(alunos.error);
  if (convites.error) throw erroDaResposta(convites.error);
  return montarLista(alunos.data as AlunoDaLista[], convites.data);
}
