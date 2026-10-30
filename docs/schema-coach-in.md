# Coach In · Desenho do banco de dados (para revisão)

Estado: **aplicado no Supabase** (0001 a 0005 em 27/10/2026, 0006 em 28/10/2026, 0008 em 29/10/2026; a 0007, do catálogo, está no PR #4 e não foi aplicada; ver "Resultado da aplicação" no fim). As migrations foram testadas num Postgres 17 (PGlite) com a camada de autenticação do Supabase simulada (247 verificações, todas passando). Base de regras: `contexto-produto.md` (regras 1 a 122) e as decisões de 27/10 (arquivar na troca de professor, exercícios e cargas seguem o aluno).

Arquivos (em `supabase/`):

| Arquivo | Conteúdo |
|---|---|
| `migrations/20261027184620_accounts_and_invites.sql` | Contas, papéis, vínculo aluno-professor, perfil do aluno, convites |
| `migrations/20261027184731_exercises_and_workouts.sql` | Biblioteca de exercícios, treino > ficha > exercício, salvar treino |
| `migrations/20261027184830_records_requests_views.sql` | Marcações, cargas, solicitação de treino, aviso de treino novo, lista de alunos |
| `migrations/20261027184907_seed_predefined_exercises.sql` | 149 exercícios pré-definidos de musculação |
| `migrations/20261027192908_advisor_fixes.sql` | Correções do Advisor: `search_path` fixo, `(select auth.uid())` nas políticas, índices nas FKs (sem mudança de regra) |
| `migrations/20261028094329_workout_before_link.sql` | 0006 · Regra 122: professor cria e edita treino para convite pendente, expirado ou recusado (`save_workout` e leitura de treinos) |
| `migrations/20261029213932_invite_preview_teacher_unavailable.sql` | 0008 · Regras 133, 134 e 137: `get_invite_preview` devolve `state = 'teacher_unavailable'` (convite de aluno válido de professor bloqueado) e `already_linked` (a conta logada já é aluno ativo desse professor) |
| `migrations/20261030120000_invite_email_claim.sql` | 0009 · Regras 139 e 140 (#52): coluna `invites.email_sent_at` e `claim_invite_email(token)`, que confere o convite e o intervalo de 60 s antes da Edge Function `enviar-convite` enviar |
| `tests/` | Simulação do Supabase, 247 verificações, `run.sh` (sobe um Postgres descartável) e `pglite/` (o mesmo, sem Postgres instalado) |

## 1. Como o banco funciona (5 ideias)

1. **O app só lê tabelas; toda escrita passa por funções.** Cada função confere papel, dono e regra de negócio no servidor. Sem isso, qualquer regra "só no app" poderia ser contornada. Todas as tabelas têm RLS ligada e o `anon` não lê nada.
2. **Papel fica em `profiles`, nunca em `user_metadata`** (que o usuário consegue editar). O mesmo e-mail tem um único papel (regra 87). O administrador é criado fora do app (instrução no fim da migration 0001); nenhuma função consegue criar ou promover administrador.
3. **O vínculo (`students`) é o centro.** O professor cadastra o aluno antes de ele ter conta; a linha nasce `invited`, vira `active` quando o aluno aceita o convite e `archived` quando ele troca de professor. Todo dado de treino (treinos, marcações, solicitações) pendura no vínculo. Cargas e perfil pendem na **conta** do aluno, porque seguem ele.
4. **Estados são derivados, não gravados.** Treino agendado, ativo, concluído e encerrado saem das datas, no fuso do aluno. O mesmo vale para "pedido atendido" e "professor já agiu". Não existe rotina diária que "vire" o treino.
5. **Ações offline são idempotentes** (`client_action_id`) e valem pela **hora em que o aluno agiu**, não pela hora do envio (regra 116).

## 2. Tabelas

| Tabela | Para que serve | Observações |
|---|---|---|
| `profiles` | Uma por conta: papel, status (ativo/bloqueado), nome, e-mail, fuso | Criada por gatilho ao cadastrar; todo mundo nasce aluno |
| `students` | Vínculo aluno-professor (e cadastro prévio) | `invited` / `active` / `archived`; um vínculo ativo por conta; arquivado guarda o motivo |
| `student_profiles` | Perfil do aluno (nascimento, telefone, altura, peso, restrições) | Por conta, não por vínculo; guarda quando aceitou o aviso e quando concluiu (retomar o passo 2) |
| `student_profile_changes` | Histórico de cada edição do perfil | Alimentado por gatilho; hoje só o aluno lê, para o histórico de peso futuro |
| `invites` | Convites de aluno (7 dias) e de professor (1 dia) | Só o hash do token é gravado; reenviar substitui o anterior; "Agora não" vira `declined` |
| `exercises` | Biblioteca (pré-definidos e criados por professor) | Nunca excluídos (um gatilho impede até para o dono); nome normalizado sem acento/caixa |
| `exercise_hidden` | "Ocultar da busca", por professor | |
| `workouts` | Treino: nome, início, semanas, fim calculado, frequência em texto | Um treino por data de início por aluno |
| `workout_days` | Fichas, com letra fixa | Remoção lógica; letra nunca reaproveitada. **Planejado (regra 126, depois da fatia 4):** `cardio_equipment` (`treadmill`/`bike`/`stairs`/`elliptical`/`free`) e `cardio_minutes` (1 a 180), `cardio_minutes` pode ser nulo (tempo em branco), mas só existe com equipamento preenchido; só indicação, sem marcação |
| `workout_exercises` | Exercício dentro da ficha (séries, reps, descanso, observação) | |
| `completions` | Treino feito (ficha + data) | Único por ficha e dia; guarda hora da ação e do recebimento |
| `student_exercise_loads` / `load_history` | Carga atual e histórico de edições | Por conta e exercício; o histórico guarda o nome do exercício |
| `training_requests` | Solicitação de novo treino | Só `open`, `canceled`, `closed` gravados |
| `workout_seen` | Controle do pop-up "Seu treino novo chegou" | Uma vez por treino |
| view `teacher_student_list` | Lista de alunos do professor já com status, treino atual, agendado, pedido e último treino | Calculada no fuso de cada aluno; respeita a RLS de quem consulta |

## 3. Quem enxerga o quê

| Dado | Aluno | Professor | Administrador |
|---|---|---|---|
| Conta / perfil | Própria; nome dos seus professores (atuais e antigos) | Própria; alunos **ativos** dele | Própria; só professores |
| Vínculos | Os próprios, **inclusive arquivados** | Os próprios, **menos arquivados** | Nenhum |
| Perfil de saúde, telefone | Próprio | Só de alunos ativos dele | Nenhum |
| Treinos | Os próprios (também de professores antigos); o **agendado fica oculto** | Os de alunos ativos dele e de convite pendente, expirado ou recusado (regra 122) | Nenhum |
| Marcações e cargas | Próprias | De alunos ativos dele; cargas só de exercícios que **ele** enxerga | Nenhum |
| Exercícios | Pré-definidos + os que aparecem nos treinos/cargas dele (mesmo de professor antigo) | Pré-definidos + os que ele criou | Nenhum |
| Convites | Pré-visualização pelo link (sem login) | Os que ele enviou | Os de professor |

Conta **bloqueada** perde acesso a tudo, mas ainda lê o próprio perfil (para mostrar a tela de bloqueio). Aluno de professor bloqueado continua vendo e marcando o treino ativo (regra 96).

## 4. Funções (o "API" do app)

**Convites e conta:** `get_invite_preview` (aceita sem login), `create_student_with_invite`, `create_teacher_invite`, `reissue_invite` (reenviar, gerar novo, corrigir e-mail), `accept_student_invite` (exige confirmar a troca se já tem professor), `accept_teacher_invite`, `decline_invite`, `claim_invite_email` (só a Edge Function `enviar-convite` chama, com o JWT de quem envia), `set_teacher_status` (bloquear/desbloquear, encerra as sessões), `admin_teacher_student_counts`, `accept_data_notice`, `save_student_profile`, `delete_my_account`.

**Biblioteca:** `search_exercises`, `similar_exercises`, `create_exercise`, `set_exercise_hidden`.

**Treino:** `save_workout` (cria ou edita o treino inteiro de uma vez), `cancel_scheduled_workout`.

**Aluno:** `mark_done`, `undo_done`, `set_load`, `request_new_workout`, `cancel_training_request`, `pending_new_workout_notice`, `acknowledge_new_workout`.

**Erros** são códigos curtos para o app traduzir para pt-BR, por exemplo: `invite_expired`, `invite_replaced`, `invite_used`, `invite_declined`, `email_mismatch`, `switch_requires_confirmation`, `scheduled_exists`, `start_in_past`, `workout_needs_day`, `day_needs_exercise`, `date_out_of_range`, `workout_not_current`, `professor_already_acted`, `request_already_open`, `exercise_exists`, `phone_invalid`, `height_invalid`, `weight_invalid`, `forbidden`. A lista completa sai de `grep "raise exception" supabase/migrations/*.sql`.

## 5. Decisões que tomei e você precisa confirmar

Estes pontos **não estavam definidos** nos documentos ou eram ambíguos. Cada um está testado, mas é fácil mudar agora e caro depois.

1. **Editar o treino ativo também exige ao menos 1 ficha e 1 exercício por ficha.** A regra 104 diz que editar "não bloqueia nada"; interpretei como "sem bloqueio por causa das marcações".
2. **No treino ativo, início e número de semanas não mudam** (só nome, frequência, fichas e exercícios). Coerente com "início e fim são fixos". Para mudar o prazo, o professor cria outro treino.
3. ~~Só dá para criar treino para aluno com vínculo ativo.~~ **Revogada em 27/10 (regra 122):** professor também cria treino para convite pendente, expirado ou recusado; arquivado segue bloqueado. Aplicada pela 0006.
4. **Um aluno não pode ter dois treinos com a mesma data de início.** Se o professor quiser trocar o treino que começa hoje, ele edita o ativo.
5. **Marcar vale só para o treino ativo e para datas entre o início dele e hoje (no fuso do aluno).** Marcação feita offline em ficha que o professor removeu **depois** vale; feita depois da remoção, não.
6. **Cargas na visão do professor:** ele vê só cargas de exercícios que enxerga (pré-definidos ou criados por ele). O professor novo não vê as cargas do exercício privado do professor antigo, mas o aluno vê.
7. **O pop-up "Seu treino novo chegou" também aparece para o primeiro treino** depois de vincular o professor.
8. **Aluno que vira professor** (regra 93): o vínculo é arquivado com o motivo `became_teacher`; dados ficam guardados, sem acesso.
9. **Telefone é guardado no padrão internacional** (`+5531999990001`). O app deve normalizar (+55 por padrão) antes de enviar.
10. **Cadastro duplicado:** o mesmo professor não cadastra dois alunos ativos com o mesmo e-mail.
11. **Convite de professor recusado ou vencido:** o administrador reemite; o histórico ("Recusou o convite em dd/mm") permanece.
12. **Professor bloqueado:** convites que ele enviou antes não podem mais ser aceitos (`teacher_unavailable`).

## 6. O que NÃO está no SQL (vai para o app, Edge Functions e configuração)

- **Ativar professor sem conta** (regra 93, e-mail sem cadastro): Edge Function **`ativar-professor`** (#51), a primeira do repositório. Recebe `{ token, senha }`; confere a senha (regra 78) e o convite por `get_invite_preview` (de professor, válido, e-mail ainda sem conta); cria a conta **já confirmada com o e-mail do convite** (nunca um e-mail vindo do app), entra com ela num cliente só da chamada e chama `accept_teacher_invite`. Se o banco recusar o aceite, **apaga a conta criada**; se a resposta do aceite se perder, confere se a conta já virou professor antes de apagar. O app, ao achar o convite já usado, tenta entrar com a mesma senha (a ativação anterior pode ter dado certo). Erros em `{ error: "codigo" }` (novo: `email_has_account`), traduzidos em `src/lib/erros.ts`; o app chama por `chamarFuncao()` de `src/lib/funcoes.ts` e depois entra com e-mail e senha. Sem migration.
  - **Base das Edge Functions** (reaproveitada pelo e-mail, #52): código em `supabase/functions/<nome>/` (`index.ts` só liga ao Supabase; a lógica fica num módulo puro com testes `*_test.ts`), utilitários em `supabase/functions/_shared/` (CORS e JSON). CI: job "Edge Functions" roda `deno check` e `deno test`. Local: `npx -y deno@2 test supabase/functions`.
  - **Risco aceito (29/10/2026, MVP):** o link é a prova de dono do e-mail. Quem tiver o link (ex.: repassado por engano) cria a conta com aquele e-mail sem confirmá-lo. Mitigação: uso único, vale 1 dia e vai só ao e-mail convidado; o dono pode recuperar por "Esqueci a senha".
  - **Chaves:** a chave secreta só existe no ambiente da função (`SUPABASE_SECRET_KEYS`, com `SUPABASE_SERVICE_ROLE_KEY` de reserva), nunca no app nem no repositório.
  - **Deploy:** pelo MCP do Supabase (`deploy_edge_function`, arquivos `index.ts`, `ativar.ts` e `../_shared/http.ts`), com **`verify_jwt = false`**: quem chama ainda não tem conta, e o que autoriza é o token do convite.
- **Enviar o convite por e-mail** (regras 136, 138, 139 e 140): Edge Function **`enviar-convite`** (#52), sobre a base do #51. Recebe só `{ token }` (qualquer outro campo, como URL ou e-mail, é ignorado) e chama `claim_invite_email` **como quem pediu o envio** (o JWT do app segue na chamada; `verify_jwt = true`). O banco confere: convite de aluno só do professor dono; de professor, só administrador; pendente e no prazo (senão `invite_used`, `invite_replaced`, `invite_expired`, `invite_declined`); com e-mail (`invite_no_email`); e **nenhum envio ao mesmo aluno e e-mail (ou ao mesmo e-mail de professor) nos últimos 60 s** (`too_many_emails`; olha os convites da pessoa, porque reenviar cria um convite novo; corrigir o e-mail não espera). Marca `email_sent_at` (a tentativa conta: se o SMTP falhar, o link segue valendo e o app mostra a espera) e devolve tipo, e-mail do convite e nome de quem convidou. A função monta o link com o segredo **`APP_URL`** + `/convite/` + token, envia pelo SMTP próprio (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; remetente "Coach In") com os textos de `docs/email-convites-pt-br.md`, e **nunca registra o token** (troca por `[token]` em qualquer log). Falha do SMTP: `email_send_failed`; limite do provedor: `too_many_emails`. Deploy pelo MCP (`index.ts`, `enviar.ts`, `textos.ts`, `../_shared/http.ts`) com **`verify_jwt = true`**.
- **E-mail:** configurar SMTP próprio (o padrão do Supabase tem limite baixo) e os textos em pt-BR (confirmar e-mail, redefinir senha, convites).
- **Autenticação (painel do Supabase), configurada em 28/10/2026:** confirmação de e-mail ligada; senha mínima de 8 com letras e dígitos; validade dos links de e-mail de 1 dia (`Email OTP expiration` = 86400, regras 88 e 89); SMTP próprio (Gmail com senha de app, trocar por provedor transacional e domínio próprio antes do lançamento); textos dos e-mails em pt-BR (`docs/email-templates-pt-br.md`, 5 modelos; o "Invite user" não é usado). **Sessão de 30 dias sem uso:** o campo `Inactivity timeout` só existe no plano Pro; decidido controlar no app, sem plano Pro por enquanto (regra 121, feito na fatia 1, #18: `src/lib/inatividade.ts` guarda o último uso no aparelho; vencida, a sessão sai só neste aparelho e o Login mostra "Entre de novo"). URLs de retorno (Authentication → URL Configuration, #14): Site URL `https://coachin.vercel.app`; Redirect URLs `https://coachin.vercel.app/**`, `https://coachin-*-viniciushp01s-projects.vercel.app/**` (previews) e `http://localhost:5173/**`. "Secure password change" desligado. E-mails de confirmação e de nova senha testados com conta real em 28/10/2026.
- **Regras de tela em TypeScript** (módulo puro e testado): "Ficha de hoje", "Semana 3 de 8", descanso após 2 dias, resumo do mês. Têm de rodar também offline.
- **Fila offline (PWA):** guardar ações no aparelho com um `client_action_id` e a hora da ação; enviar ao abrir o app. As funções já aceitam reenvio.
- **Fuso:** o app deve atualizar `profiles.timezone` a cada abertura com conexão.
- **Limite de tentativas** em login, criação de conta e pré-visualização de convite (a regra 83 revela se o e-mail tem conta).

## 7. Antes de aplicar no Supabase de verdade

Testei localmente com a autenticação **simulada**. Três pontos só se confirmam no projeto real, e a primeira aplicação deve ser acompanhada:

1. O gatilho em `auth.users` que cria o perfil, `delete from auth.users` (excluir conta) e `delete from auth.sessions` (bloquear professor) dependem de permissões do schema `auth`. Cadastre um usuário de teste, bloqueie e exclua uma conta de teste logo após aplicar.
2. Rodar o **Security Advisor** do Supabase depois (alertas de RLS ou de função sem `search_path`).
3. Criar o administrador conforme o comentário no fim da migration 0001.

**Ordem de aplicação:** os arquivos de `supabase/migrations/`, em ordem numérica (0001 accounts_and_invites, 0002 exercises_and_workouts, 0003 records_requests_views, 0004 seed_predefined_exercises, 0005 advisor_fixes, 0006 workout_before_link, 0008 invite_preview_teacher_unavailable), no projeto `kfjjiajxgbsqpuskxbzb`. Só o Claude Code aplica (MCP), e gera os tipos TypeScript em seguida.

**Rodar os testes:** `supabase/tests/run.sh` (precisa de Postgres 16 instalado e Linux/WSL/macOS; sobe e derruba um banco descartável) ou, sem Postgres (Windows), `npm --prefix supabase/tests/pglite install` e `node supabase/tests/pglite/run.mjs` (Postgres 17.5 em WebAssembly, PGlite 0.4.6, banco em memória, um comando por transação como o `psql -f`; `--sem-pgcrypto` troca `digest` e `gen_random_bytes` por equivalentes nativos só no harness). Os dois devem terminar com "TODOS OS TESTES PASSARAM".

### Resultado da aplicação (27/10/2026)

- Projeto `kfjjiajxgbsqpuskxbzb` (Postgres 17). Criados: 15 tabelas (todas com RLS), 26 funções em `public`, 23 em `private`, 149 exercícios pré-definidos.
- **Item 1 confirmado:** cadastro de usuário de teste criou o perfil como aluno (e-mail em minúsculas); `set_teacher_status` chamado pelo admin bloqueou o professor e apagou a sessão dele em `auth.sessions`; `delete_my_account` chamado pelo aluno apagou a conta em `auth.users` e o perfil por cascata. Usuários de teste removidos.
- **Item 2 (Security Advisor):** nenhum alerta de RLS. Alertas que ficaram:
  - `function_search_path_mutable` (11 funções), `auth_rls_initplan` (18 políticas) e `unindexed_foreign_keys` (7): **corrigidos pela 0005** (27/10/2026). A 0005 foi testada antes com os 203 testes, num Postgres 17 em WebAssembly (PGlite), porque esta máquina não tem Postgres nem WSL.
  - `anon/authenticated_security_definer_function_executable` nas funções RPC: **intencional** (é o desenho: toda escrita passa por função que confere papel; `get_invite_preview` é aberta para o link de convite).
  - `auth_leaked_password_protection`: configuração do painel (Authentication > Policies), não do SQL. Pendente de decisão; pode exigir plano pago.
  - Desempenho, aceitos: `multiple_permissive_policies` (uma política por papel, de propósito, para ficar legível) e `unused_index` (o banco ainda não tem dados).
- **Item 3 (administrador):** criado (conta criada pelo painel e promovida a `admin`; é o único administrador).
- Tipos TypeScript gerados em `supabase/database.types.ts`.

### Resultado da aplicação da 0006 (28/10/2026)

- **Antes:** banco real conferido (corpo de `save_workout` e políticas iguais aos arquivos; texto das 0001 a 0005 idêntico ao gravado em `schema_migrations`, por md5).
- **Testes (PGlite, Postgres 17.5):** antes da 0006, 203 verificações; os testes novos falham sem ela (`student_not_found`). Com a 0006, **239 verificações** (36 novas na seção 15: criar e editar ativo/agendado para convite pendente, expirado e recusado; leitura do professor e bloqueio de outro professor; aceite com treino já pronto e pop-up; agendado oculto até a data; reenvio mantém o treino; arquivado por troca ou por virar professor dá `student_not_found`; regras de data; lista segue `convite_*`).
- **Aplicação:** registrada como versão `20261028094329` (arquivo local renomeado para essa versão; texto idêntico por md5).
- **Advisor:** igual ao anterior. Segurança: funções RPC `security definer` (1 para `anon`, `get_invite_preview`; 23 para `authenticated`) e `auth_leaked_password_protection`. Desempenho: `multiple_permissive_policies` (9) e `unused_index` (16). Nenhum alerta novo.
- **Tipos:** sem diferença (nenhuma assinatura mudou); `database.types.ts` mantido.
- **Teste de fumaça no projeto real**, num bloco desfeito ao final (nada gravado): professor de teste cadastra aluno sem conta, cria treino com início hoje, lê o treino (1) e a lista mostra `convite_pendente`; com o vínculo arquivado, `save_workout` dá `student_not_found`. Depois: 1 usuário (o administrador), 149 exercícios, nenhum aluno ou treino.

### Resultado da aplicação da 0008 (29/10/2026, issue #53)

- **O que muda:** só `get_invite_preview` (`create or replace`, mesma assinatura e mesmo `search_path`, grants mantidos). Precedência da regra 137: usado, substituído, vencido e recusado vêm antes, então só o convite de aluno válido vira `teacher_unavailable` quando o professor do cadastro (`students.teacher_id`, o mesmo que o `accept_student_invite` confere) está bloqueado; desbloqueado no prazo, volta a `valid`. O campo novo `already_linked` só fala da conta de quem abre (`auth.uid()`); sem login ou em convite de professor é `false`.
- **Testes (PGlite, Postgres 17.5):** os testes novos falham sem ela. Com a 0008, **247 verificações** (seções 10 e 11: prévia de professor bloqueado, desbloqueio, recusado antes do bloqueio, `already_linked` para o aluno do mesmo professor, para outro aluno e sem login).
- **Aplicação:** registrada como versão `20261029213932` (arquivo local renomeado para essa versão; texto idêntico por md5). Conferido: `get_invite_preview('lixo')` devolve `invalid`; `EXECUTE` para `anon` e `authenticated`; `search_path=public, extensions`.
- **Advisor:** sem alerta novo do SQL. Segurança: funções RPC `security definer` (1 para `anon`, `get_invite_preview`; 23 para `authenticated`), `auth_leaked_password_protection` e `auth_otp_long_expiry` (configuração do Auth no painel, validade do link de e-mail acima de 1 hora; não vem desta migration). Desempenho: `multiple_permissive_policies` (9) e `unused_index` (10).
- **Tipos:** sem diferença (`get_invite_preview` devolve `Json`); `database.types.ts` mantido.
