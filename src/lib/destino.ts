import type { Database } from "@db/database.types";

export type Papel = Database["public"]["Enums"]["app_role"];

/** O que o servidor diz sobre quem está usando o app. Nunca vem de user_metadata. */
export type EstadoSessao =
  | {
      tipo: "anonimo";
      /** A sessão foi encerrada por 30 dias sem uso: o Login mostra "Entre de novo" (regra 121). */
      sessaoExpirada?: true;
    }
  | {
      tipo: "logado";
      papel: Papel;
      bloqueado: boolean;
      nome: string;
      /** E-mail da conta ("Você está entrando como…", regra 97). */
      email: string;
      /** Só para aluno: tem vínculo ativo com um professor. */
      temProfessor: boolean;
      /** Só para aluno: confirmou o aviso de dados (passo 1 do primeiro acesso). */
      avisoAceito: boolean;
      /** Só para aluno: concluiu o perfil (passo 2 do primeiro acesso). */
      perfilConcluido: boolean;
    };

export type Destino =
  | "/entrar"
  | "/bloqueado"
  | "/admin"
  | "/professor"
  | "/sem-professor"
  | "/primeiro-acesso"
  | "/aluno";

/**
 * Para onde cada pessoa vai ao abrir o app.
 * - Bloqueado vem antes do papel (regras 95 e 119).
 * - Aluno sem vínculo ativo vê "Você ainda não tem um professor"; professor ainda não
 *   autorizado é uma conta de aluno sem vínculo e cai na mesma tela (regra 90).
 * - Com vínculo e perfil incompleto, retoma o primeiro acesso (regras 49, 86 e 91).
 */
export function destinoDaSessao(estado: EstadoSessao): Destino {
  if (estado.tipo === "anonimo") return "/entrar";
  if (estado.bloqueado) return "/bloqueado";
  if (estado.papel === "admin") return "/admin";
  if (estado.papel === "professor") return "/professor";
  if (!estado.temProfessor) return "/sem-professor";
  if (!estado.perfilConcluido) return "/primeiro-acesso";
  return "/aluno";
}

export type DestinoDaRaiz = { to: Destino } | { to: "/convite/$token"; params: { token: string } };

/**
 * Para onde a raiz do app leva, com o convite guardado no aparelho: quem acabou de entrar volta
 * ao convite que abriu antes de criar a conta ou fazer login (regras 79 e 97), em qualquer papel
 * (a tela do convite trata a conta errada, regra 134). Sem sessão ou bloqueado, o convite espera.
 */
export function destinoDaRaiz(estado: EstadoSessao, conviteGuardado: string | null): DestinoDaRaiz {
  const destino = destinoDaSessao(estado);
  if (conviteGuardado && destino !== "/entrar" && destino !== "/bloqueado") {
    return { to: "/convite/$token", params: { token: conviteGuardado } };
  }
  return { to: destino };
}
