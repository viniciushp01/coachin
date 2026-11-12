import type { Database } from "@db/database.types";
import { erroDaResposta } from "@/lib/erros";
import { emOrdemAlfabetica, plural, resumoDaBusca } from "@/lib/listas";
import { supabase } from "@/lib/supabase";
import type { TomChip } from "@/ui";
import { CHIP_DO_ESTADO, CHIP_SEM_CONVITE, dataCurta, textoDaRecusa } from "./conviteDoAluno";

type LinhaDaView = Database["public"]["Views"]["teacher_student_list"]["Row"];

// Um literal só: o cliente do Supabase tipa a resposta a partir do texto das colunas.
const COLUNAS_DA_VIEW =
  "student_id, name, list_status, invite_id, invite_expires_at, invite_declined_at, current_end_date, current_concluded, scheduled_start_date, last_done_on, last_done_letter";
export type AlunoDaLista = Pick<
  LinhaDaView,
  | "student_id"
  | "name"
  | "invite_id"
  | "invite_expires_at"
  | "invite_declined_at"
  | "current_end_date"
  | "current_concluded"
  | "scheduled_start_date"
  | "last_done_on"
  | "last_done_letter"
> & { list_status: StatusDoAluno };

/** Data de envio do convite, lida direto de `invites` (a view não a traz). */
export type EnvioDoConvite = { id: string; created_at: string };

/** Os status da lista, como a view `teacher_student_list` os calcula (regras 34, 55, 102 e 164). */
export type StatusDoAluno =
  | "ativo"
  | "sem_treino"
  | "quase_no_fim"
  | "sem_convite"
  | "convite_pendente"
  | "convite_expirado"
  | "convite_recusado";

export type LinhaDoAluno = {
  /** Id do vínculo (`students.id`). */
  id: string;
  nome: string;
  status: StatusDoAluno;
  /** Linha de detalhe: as datas do convite ou o treino do aluno vinculado (regra 147 (1)). */
  detalhe: string | undefined;
};

/** Chip de cada status (design.md, `Chip`). */
export const CHIP_DO_ALUNO: Record<StatusDoAluno, { tom: TomChip; texto: string }> = {
  ativo: { tom: "success", texto: "Ativo" },
  sem_treino: { tom: "neutral", texto: "Sem treino" },
  quase_no_fim: { tom: "warning", texto: "Quase no fim" },
  sem_convite: CHIP_SEM_CONVITE,
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
    case "sem_convite": // regra 164; texto do aviso da tela do aluno (Convite do aluno · 8)
      return "Convite ainda não enviado";
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

/** "dd/mm" de uma data sem hora ("aaaa-mm-dd", já no fuso do aluno), sem passar por fuso. */
export function diaEMes(data: string) {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** Dias corridos de `de` até `ate`, as duas "aaaa-mm-dd". */
function diasEntre(de: string, ate: string) {
  const emDias = (data: string) => Date.parse(`${data}T00:00:00Z`) / 86_400_000;
  return emDias(ate) - emDias(de);
}

const comMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * O último treino em relação a `hoje` ("aaaa-mm-dd" no aparelho), em minúscula para o meio da
 * linha (regra 147 (1)): "treinou hoje", "treinou ontem", "último treino em 27/10" (sem "há N
 * dias") ou "ainda não treinou". Marcação adiante de hoje (aluno noutro fuso) conta como hoje.
 */
export function ultimoTreino(feitoEm: string | null, hoje: string) {
  if (!feitoEm) return "ainda não treinou";
  const dias = diasEntre(feitoEm, hoje);
  if (dias <= 0) return "treinou hoje";
  if (dias === 1) return "treinou ontem";
  return `último treino em ${diaEMes(feitoEm)}`;
}

/**
 * Detalhe do aluno vinculado (regras 43, 56 e 147 (1); Figma "Professor · Alunos", Lista · 1).
 * Com treino ativo e outro agendado, só o ativo.
 */
function detalheDoVinculado(aluno: AlunoDaLista, hoje: string) {
  const ultimo = ultimoTreino(aluno.last_done_on, hoje);
  switch (aluno.list_status) {
    case "ativo":
      if (aluno.current_concluded && aluno.current_end_date)
        return `Treino concluído em ${diaEMes(aluno.current_end_date)} · ${ultimo}`;
      return aluno.last_done_on && aluno.last_done_letter
        ? `${comMaiuscula(ultimo)} · Ficha ${aluno.last_done_letter}`
        : comMaiuscula(ultimo);
    case "quase_no_fim":
      return aluno.current_end_date
        ? `Fim em ${diaEMes(aluno.current_end_date)} · ${ultimo}`
        : comMaiuscula(ultimo);
    case "sem_treino":
      return aluno.scheduled_start_date
        ? `Treino começa em ${diaEMes(aluno.scheduled_start_date)}`
        : comMaiuscula(ultimo);
    default:
      return undefined;
  }
}

/** Uma linha da Lista de alunos (regras 55, 62, 102, 114, 122 e 147). */
export function linhaDoAluno(
  aluno: AlunoDaLista,
  hoje: string,
  conviteEnviadoEm?: string,
): LinhaDoAluno {
  const doConvite = detalheDoConvite(aluno, conviteEnviadoEm);
  return {
    id: aluno.student_id ?? "",
    nome: aluno.name ?? "",
    status: aluno.list_status,
    detalhe: doConvite ?? detalheDoVinculado(aluno, hoje),
  };
}

/** As linhas da lista, em ordem alfabética pt-BR (regra 59). */
export function montarLista(
  alunos: AlunoDaLista[],
  envios: EnvioDoConvite[],
  hoje: string,
): LinhaDoAluno[] {
  const enviadoEm = new Map(envios.map((c) => [c.id, c.created_at]));
  return emOrdemAlfabetica(
    alunos.map((a) => linhaDoAluno(a, hoje, a.invite_id ? enviadoEm.get(a.invite_id) : undefined)),
  );
}

/** "6 alunos", contando os alunos com convite (regra 147 (2)). Durante a busca, "N resultados". */
export function resumoDaLista(linhas: LinhaDoAluno[], termo = "") {
  const busca = resumoDaBusca(linhas, termo);
  if (busca !== null) return busca;
  return plural(linhas.length, "aluno", "alunos");
}

/** Hoje no aparelho, "aaaa-mm-dd" (o mesmo dia do aluno na maioria dos casos, regra 115). */
function hojeNoAparelho() {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
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
  return montarLista(alunos.data as AlunoDaLista[], convites.data, hojeNoAparelho());
}
