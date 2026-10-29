import type { Database } from "@db/database.types";
import { erroDaResposta } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import type { TomChip } from "@/ui";
import { dataCurta, estadoDoConvite } from "@/features/alunos/conviteDoAluno";

type Tabelas = Database["public"]["Tables"];

const COLUNAS_DO_PERFIL = "id, full_name, email, status, created_at";
export type PerfilDeProfessor = Pick<
  Tabelas["profiles"]["Row"],
  "id" | "full_name" | "email" | "status" | "created_at"
>;

const COLUNAS_DO_CONVITE =
  "id, email, invitee_name, status, created_at, expires_at, declined_at, accepted_at, accepted_by";
export type ConviteDeProfessor = Pick<
  Tabelas["invites"]["Row"],
  | "id"
  | "email"
  | "invitee_name"
  | "status"
  | "created_at"
  | "expires_at"
  | "declined_at"
  | "accepted_at"
  | "accepted_by"
>;

/** Os cinco estados da Lista de professores (regras 92 e 102). */
export type EstadoDoProfessor = "ativo" | "pendente" | "expirado" | "recusado" | "bloqueado";

export type LinhaDeProfessor = {
  /** Id do perfil (ativo, bloqueado) ou do convite (os demais). */
  id: string;
  nome: string;
  estado: EstadoDoProfessor;
  detalhe: string;
};

/** Chip de cada estado (tons do Figma "Admin · Lista de professores"). */
export const CHIP_DO_PROFESSOR: Record<EstadoDoProfessor, { tom: TomChip; texto: string }> = {
  ativo: { tom: "success", texto: "Ativo" },
  pendente: { tom: "info", texto: "Convite pendente" },
  expirado: { tom: "neutral", texto: "Convite expirado" },
  recusado: { tom: "neutral", texto: "Convite recusado" },
  bloqueado: { tom: "neutral", texto: "Bloqueado" },
};

/**
 * Professores (perfis ativos ou bloqueados) e convites de professor, um por e-mail, em ordem
 * alfabética. Do convite vale o mais recente do e-mail; e-mail que já é professor não repete.
 * Convite usado ou substituído não aparece.
 */
export function montarLista(
  perfis: PerfilDeProfessor[],
  convites: ConviteDeProfessor[],
  agora = new Date(),
): LinhaDeProfessor[] {
  const linhas: LinhaDeProfessor[] = perfis.map((p) => {
    if (p.status === "blocked") {
      // Sem data: o banco não guarda quando o professor foi bloqueado.
      return { id: p.id, nome: p.full_name, estado: "bloqueado", detalhe: "Acesso bloqueado" };
    }
    const aceite = convites.find((c) => c.accepted_by === p.id && c.accepted_at)?.accepted_at;
    return {
      id: p.id,
      nome: p.full_name,
      estado: "ativo",
      detalhe: `Professor desde ${dataCurta(aceite ?? p.created_at)}`,
    };
  });

  const emailsVistos = new Set(perfis.map((p) => p.email));
  const recentes = [...convites].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const c of recentes) {
    if (!c.email || emailsVistos.has(c.email)) continue;
    emailsVistos.add(c.email);
    const estado = estadoDoConvite(c, agora);
    const nome = c.invitee_name ?? c.email;
    if (estado === "pendente") {
      linhas.push({
        id: c.id,
        nome,
        estado,
        detalhe: `Convite válido até ${dataCurta(c.expires_at)}`,
      });
    } else if (estado === "expirado") {
      linhas.push({
        id: c.id,
        nome,
        estado,
        detalhe: `Convite expirou em ${dataCurta(c.expires_at)}`,
      });
    } else if (estado === "recusado") {
      const detalhe = c.declined_at
        ? `Recusou o convite em ${dataCurta(c.declined_at)}`
        : "Recusou o convite";
      linhas.push({ id: c.id, nome, estado, detalhe });
    }
  }

  return linhas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Busca por parte do nome, sem diferenciar maiúsculas nem acentos. */
export function buscarPorNome(linhas: LinhaDeProfessor[], termo: string) {
  const busca = semAcento(termo.trim());
  return busca ? linhas.filter((l) => semAcento(l.nome).includes(busca)) : linhas;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "4 professores · 1 convite pendente"; durante a busca, "N resultados". */
export function resumoDaLista(linhas: LinhaDeProfessor[], termo = "") {
  if (termo.trim()) {
    return plural(buscarPorNome(linhas, termo).length, "resultado", "resultados");
  }
  const total = plural(linhas.length, "professor", "professores");
  const pendentes = linhas.filter((l) => l.estado === "pendente").length;
  return pendentes
    ? `${total} · ${plural(pendentes, "convite pendente", "convites pendentes")}`
    : total;
}

/** Lê a lista com a RLS do administrador (só professores e convites de professor). */
export async function lerProfessores(agora = new Date()): Promise<LinhaDeProfessor[]> {
  const [perfis, convites] = await Promise.all([
    supabase.from("profiles").select(COLUNAS_DO_PERFIL).eq("role", "professor"),
    supabase.from("invites").select(COLUNAS_DO_CONVITE).eq("kind", "teacher"),
  ]);
  if (perfis.error) throw erroDaResposta(perfis.error);
  if (convites.error) throw erroDaResposta(convites.error);
  return montarLista(perfis.data, convites.data, agora);
}
