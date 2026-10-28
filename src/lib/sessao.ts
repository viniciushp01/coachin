import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { destinoDaSessao, type Destino, type EstadoSessao } from "./destino";
import { erroDaResposta } from "./erros";
import { supabase } from "./supabase";

const ANONIMO: EstadoSessao = { tipo: "anonimo" };

/** Erros do PostgREST que significam "sessão não vale mais". */
function sessaoInvalida(erro: { code?: string; status?: number } | null) {
  return erro?.code === "PGRST301" || erro?.code === "PGRST303" || erro?.status === 401;
}

/**
 * Lê papel, bloqueio e vínculo no servidor (RLS do usuário logado).
 * A sessão local só diz QUEM é; O QUE a pessoa pode ver vem sempre do banco.
 */
export async function carregarEstadoSessao(): Promise<EstadoSessao> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return ANONIMO;
  const id = session.user.id;

  const perfil = await supabase
    .from("profiles")
    .select("role, status, full_name")
    .eq("id", id)
    .single();
  if (perfil.error) {
    if (sessaoInvalida(perfil.error)) {
      await supabase.auth.signOut({ scope: "local" });
      return ANONIMO;
    }
    throw erroDaResposta(perfil.error);
  }

  const base = {
    tipo: "logado" as const,
    papel: perfil.data.role,
    bloqueado: perfil.data.status === "blocked",
    nome: perfil.data.full_name,
    temProfessor: false,
    avisoAceito: false,
    perfilConcluido: false,
  };
  // Conta bloqueada só lê o próprio perfil; professor e administrador não têm vínculo.
  if (base.bloqueado || base.papel !== "aluno") return base;

  const [vinculo, saude] = await Promise.all([
    supabase.from("students").select("id").eq("user_id", id).eq("status", "active").maybeSingle(),
    supabase
      .from("student_profiles")
      .select("notice_accepted_at, completed_at")
      .eq("user_id", id)
      .maybeSingle(),
  ]);
  if (vinculo.error) throw erroDaResposta(vinculo.error);
  if (saude.error) throw erroDaResposta(saude.error);

  return {
    ...base,
    temProfessor: vinculo.data !== null,
    avisoAceito: Boolean(saude.data?.notice_accepted_at),
    perfilConcluido: Boolean(saude.data?.completed_at),
  };
}

export const estadoSessaoQuery = queryOptions({
  queryKey: ["sessao"],
  queryFn: carregarEstadoSessao,
  staleTime: 60_000,
});

/**
 * Guarda de rota: garante que a pessoa está na área certa; se não, redireciona.
 * Usar no `beforeLoad` de cada área. Devolve o estado para a tela usar.
 */
export async function exigirDestino(queryClient: QueryClient, area: Destino) {
  const estado = await queryClient.ensureQueryData(estadoSessaoQuery);
  const destino = destinoDaSessao(estado);
  if (destino !== area) throw redirect({ to: destino, replace: true });
  return { estado };
}

/** Sair: encerra a sessão; a troca de estado leva à tela de entrar. */
export async function sair() {
  await supabase.auth.signOut();
}
