/**
 * Tradução dos erros do banco para pt-BR.
 *
 * As funções do banco lançam códigos curtos (`raise exception 'invite_expired'`). Cada código
 * tem uma mensagem aqui, no tom do design.md: acolhedor, sem culpa. Um teste (erros.test.ts)
 * lê as migrations e falha se algum código ficar sem tradução.
 *
 * Mensagens marcadas com [produto] são textos já decididos no contexto-produto.md; as demais
 * são propostas e podem mudar na revisão. Telas com estado próprio (ex.: convite expirado é uma
 * tela inteira, não um toast) usam o `codigo` e não precisam desta mensagem.
 */
export const MENSAGENS = {
  // Conta e acesso
  not_authenticated: "Entre na sua conta para continuar.",
  account_blocked: "Sua conta está bloqueada.",
  email_not_confirmed: "Confirme seu e-mail para continuar.",
  role_not_allowed: "Este convite não é para o tipo da sua conta.",
  forbidden: "Você não tem acesso a isso.",
  no_teacher_link: "Você ainda não tem um professor.",
  timezone_invalid: "Não conseguimos ler o fuso do aparelho.",

  // Autenticação (erros do Supabase Auth, não das funções do banco; ver erroDeAuth)
  invalid_credentials: "E-mail ou senha não conferem.", // [produto] regra 51
  user_already_exists: "E-mail em uso. Tente logar utilizando ele, ou solicite alteração de senha.", // [produto] regra 83
  weak_password: "A senha precisa ter pelo menos 8 caracteres, com letras e números.", // [produto] regra 78
  too_many_requests: "Muitas tentativas. Espere um pouco e tente de novo.",
  same_password: "É a sua senha atual. Escolha uma senha diferente.", // [produto] regra 131
  too_many_emails: "Muitos envios. Espere um pouco.", // [produto] regra 130

  // Convites
  invite_invalid: "Este link não vale mais.",
  invite_expired: "Este convite expirou.",
  invite_used: "Este convite já foi usado.",
  invite_replaced: "Este link não vale mais.", // [produto] regra 82
  invite_declined: "Este convite foi recusado.",
  invite_not_found: "Não encontramos este convite.",
  invite_not_pending: "Este convite não está mais pendente.",
  email_mismatch: "Este convite foi enviado para outro e-mail.",
  email_has_account: "Este e-mail já tem uma conta. Entre com ela para ativar o acesso.", // Edge Function ativar-professor
  already_linked: "Sua conta já está vinculada a este professor.",
  switch_requires_confirmation: "Confirme a troca de professor.",
  teacher_unavailable: "Este professor não está disponível.",
  already_teacher: "Este e-mail já é de um professor.",
  email_is_admin: "Este e-mail é do administrador.",
  student_already_linked: "Este aluno já ativou o acesso.",
  student_email_taken: "Você já tem um aluno com este e-mail.",
  teacher_not_found: "Não encontramos este professor.",

  // Dados pessoais
  // Atenção: `name_required` é lançado por funções diferentes (perfil do próprio aluno, cadastro de
  // aluno, convite de professor, criar exercício). "Digite seu nome." vale só para o perfil; as
  // outras telas sobrescrevem o texto no campo (ex.: "Digite o nome do aluno.").
  name_required: "Digite seu nome.", // [produto]
  email_invalid: "Digite um e-mail válido, como nome@exemplo.com.", // [produto]
  phone_invalid: "Digite um telefone com DDD, como (31) 91234-5678.", // [produto]
  birth_date_invalid: "Essa data ainda não chegou. Confira o nascimento.", // [produto]
  height_invalid: "Digite uma altura entre 1,00 m e 2,50 m.", // [produto]
  weight_invalid: "Digite um peso entre 20 kg e 300 kg.", // [produto]
  notice_not_accepted: "Confirme que leu o aviso de dados.",

  // Biblioteca de exercícios
  exercise_exists: "Já existe um exercício com esse nome.",
  exercise_not_found: "Não encontramos este exercício.",
  exercises_are_permanent: "Exercícios não podem ser excluídos.",
  name_too_long: "O nome está longo demais.",

  // Montar treino
  workout_name_required: "Digite o nome do treino.", // [produto]
  workout_needs_day: "Adicione pelo menos uma ficha.",
  day_needs_exercise: "Cada ficha precisa de pelo menos um exercício.",
  day_name_required: "Digite o nome da ficha.",
  sets_invalid: "Confira o número de séries.",
  reps_invalid: "Confira as repetições.",
  rest_invalid: "Confira o tempo de descanso.",
  weeks_invalid: "Confira o número de semanas.",
  start_date_invalid: "Confira a data de início.",
  start_in_past: "O início não pode ser numa data passada.",
  start_date_taken: "Já existe um treino com essa data de início.",
  scheduled_exists: "Este aluno já tem um treino agendado.",
  active_workout_dates_locked: "O início e as semanas do treino ativo não mudam.",
  workout_not_editable: "Este treino não pode mais ser alterado.",
  workout_not_found: "Não encontramos este treino.",
  workout_not_scheduled: "Este treino não está mais agendado.",
  student_not_found: "Não encontramos este aluno.",

  // Treino do aluno
  workout_not_current: "Este treino não está mais ativo.",
  day_not_found: "Não encontramos esta ficha.",
  day_removed: "Esta ficha foi removida do treino.",
  date_out_of_range: "Essa data está fora do treino.",
  exercise_not_in_workout: "Este exercício não está no seu treino.",
  load_invalid: "Confira a carga.",

  // Solicitação de novo treino
  request_already_open: "Você já pediu um treino novo.",
  no_open_request: "Não há pedido aberto.",
  professor_already_acted: "Seu professor já atendeu o pedido.",

  // Erros do app (não vêm do banco)
  invalid_arguments: "Algo deu errado. Tente de novo.",
  sem_conexao: "Sem conexão. Tente de novo.",
  erro_desconhecido: "Algo deu errado. Tente de novo.",
} as const satisfies Record<string, string>;

export type CodigoErro = keyof typeof MENSAGENS;

/** Erro já traduzido. `codigo` decide a tela; `message` é o texto pronto para mostrar. */
export class ErroApp extends Error {
  readonly codigo: CodigoErro;

  constructor(codigo: CodigoErro, options?: { cause?: unknown }) {
    super(MENSAGENS[codigo], options);
    this.name = "ErroApp";
    this.codigo = codigo;
  }
}

function eCodigo(valor: unknown): valor is CodigoErro {
  return typeof valor === "string" && Object.hasOwn(MENSAGENS, valor);
}

/**
 * Converte qualquer falha de chamada ao Supabase em `ErroApp`.
 * - `raise exception 'codigo'` chega como `{ code: "P0001", message: "codigo" }`.
 * - Falha de rede chega como `TypeError` (fetch) ou com "Failed to fetch" na mensagem.
 */
export function erroDaResposta(erro: unknown): ErroApp {
  if (erro instanceof ErroApp) return erro;
  const mensagem =
    typeof erro === "object" && erro !== null && "message" in erro
      ? String((erro as { message: unknown }).message)
      : "";
  if (eCodigo(mensagem)) return new ErroApp(mensagem, { cause: erro });
  // Sem permissão de executar a função (ex.: sem login): o Postgres responde 42501.
  if (typeof erro === "object" && erro !== null && (erro as { code?: unknown }).code === "42501") {
    return new ErroApp("forbidden", { cause: erro });
  }
  if (erro instanceof TypeError || /failed to fetch|network|load failed/i.test(mensagem)) {
    return new ErroApp("sem_conexao", { cause: erro });
  }
  return new ErroApp("erro_desconhecido", { cause: erro });
}

/**
 * Converte o erro do Supabase Auth (login, criar conta, redefinir senha) em `ErroApp`.
 * O Auth informa o motivo em `code` (ex.: `invalid_credentials`); `status` 429 é limite de envios.
 */
export function erroDeAuth(erro: unknown): ErroApp {
  if (erro instanceof ErroApp) return erro;
  const dados =
    typeof erro === "object" && erro !== null
      ? (erro as { code?: unknown; status?: unknown; message?: unknown })
      : {};
  const codigo = typeof dados.code === "string" ? dados.code : "";
  const mensagem = typeof dados.message === "string" ? dados.message : "";
  const causa = { cause: erro };
  if (codigo === "invalid_credentials") return new ErroApp("invalid_credentials", causa);
  if (codigo === "email_not_confirmed") return new ErroApp("email_not_confirmed", causa);
  if (codigo === "user_already_exists" || codigo === "email_exists")
    return new ErroApp("user_already_exists", causa);
  if (codigo === "same_password") return new ErroApp("same_password", causa);
  if (codigo === "weak_password") return new ErroApp("weak_password", causa);
  if (codigo === "over_email_send_rate_limit") return new ErroApp("too_many_emails", causa);
  if (dados.status === 429 || /^over_.*_rate_limit$/.test(codigo))
    return new ErroApp("too_many_requests", causa);
  if (
    erro instanceof TypeError ||
    dados.status === 0 ||
    /failed to fetch|network|load failed/i.test(mensagem)
  ) {
    return new ErroApp("sem_conexao", causa);
  }
  return new ErroApp("erro_desconhecido", causa);
}
