import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { destinoDaSessao, type Destino, type EstadoSessao } from "./destino";
import { erroDaResposta } from "./erros";
import { lerUltimoUso, registrarUso, sessaoVencida } from "./inatividade";
import { supabase } from "./supabase";

const ANONIMO: EstadoSessao = { tipo: "anonimo" };

/**
 * A última sessão deste aparelho venceu por inatividade (regra 121). Vive fora do cache do
 * TanStack Query porque sair limpa o cache; some quando alguém entra de novo.
 */
let expirouPorInatividade = false;

function anonimo(): EstadoSessao {
  return expirouPorInatividade ? { tipo: "anonimo", sessaoExpirada: true } : ANONIMO;
}

/**
 * Regra dos 30 dias sem uso: com sessão vencida, sai só neste aparelho (a fila local fica,
 * regra 116); senão, marca o uso de agora. Devolve se a sessão continua valendo.
 * Lê só o aparelho: não vai ao servidor.
 */
async function aplicarRegraDosTrintaDias(): Promise<boolean> {
  if (!sessaoVencida(lerUltimoUso(), Date.now())) {
    expirouPorInatividade = false;
    registrarUso();
    return true;
  }
  expirouPorInatividade = true;
  await supabase.auth.signOut({ scope: "local" });
  return false;
}

/** Acabou de entrar com e-mail e senha: conta como uso e tira o aviso de sessão expirada. */
export function registrarEntrada() {
  expirouPorInatividade = false;
  registrarUso();
}

/** Ao voltar ao app (aba visível de novo): aplica a regra dos 30 dias, se houver sessão. */
export async function verificarInatividade() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) await aplicarRegraDosTrintaDias();
}

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
  if (!session || !(await aplicarRegraDosTrintaDias())) return anonimo();
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

/**
 * Sair: encerra a sessão só neste aparelho (o padrão do Supabase desconectaria todos; isso é
 * só da troca de senha, regra 121). Mesmo sem conexão a sessão local é removida. O SIGNED_OUT
 * limpa o cache e as guardas de rota levam ao Login (`main.tsx`); a fila local fica.
 */
export async function sair() {
  await supabase.auth.signOut({ scope: "local" });
}
