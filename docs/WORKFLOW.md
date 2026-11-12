# Coach In · Workflow de desenvolvimento

Como produto, design e código andam juntos. Leia este arquivo antes de planejar trabalho novo. Ele não repete regras de negócio (vivem em `docs/contexto/contexto-produto.md`) nem o desenho do banco (`docs/schema-coach-in.md`).

Última verificação do estado: 06/11/2026.

## 1. Princípios

1. **O repositório é a fonte da verdade.** Desde 05/11/2026, o Project do claude.ai não é mais espelhado (seção 8).
2. **Documento, não conversa.** Cada agente começa do zero e só sabe o que está em arquivo. Decisão que não foi escrita não existe.
3. **Ninguém inventa regra de negócio.** Dúvida de negócio vira pergunta; decisão vira regra numerada em `contexto-produto.md`. Textos e estados pequenos não viram regra (seção 7).
4. **Só o Claude Code aplica migrations.** Os chats de produto desenham, revisam e testam, mas não aplicam. Migration aplicada nunca se edita: cria-se uma nova.
5. **Tela e banco da mesma fatia andam juntos.** Nada de tabela sem tela que a use, nem tela sem teste de acesso (RLS) por trás.
6. **Um único dono para o que é compartilhado** (componentes base, migrations, numeração de regras). Isso evita cinco botões diferentes e dois `0007`.

## 2. Quem faz o quê

| Quem | Faz | Não faz |
|---|---|---|
| **Você** | Decide produto, aprova entregas, conversa com o jurídico | Aplicar migration à mão |
| **Claude no app (chats)** | Decide e registra regras, desenha no Figma, escreve e revisa schema, responde dúvidas de produto | Aplicar migration; editar código do app |
| **Claude Code (repositório)** | Código do app, migrations, testes, tipos, PRs, deploy | Inventar regra; mudar design sem registrar |

Os dois lados conversam por **arquivos**: pendências voltam para `contexto-produto.md` (seção "Pontos em aberto") e para issues.

## 3. Estado atual (12/11/2026)

- **Produto:** regras 1 a 165 (a 164 está reservada no PR #136, ainda aberto). Nenhum ponto bloqueando o piloto. Pendências menores na seção 8 do `contexto-produto.md`.
- **Banco:** migrations 0001 a 0014 aplicadas no Supabase (`kfjjiajxgbsqpuskxbzb`) e iguais às do repositório (a 0007 e a 0012 entraram pelo SQL Editor; ver `docs/schema-coach-in.md`). 373 verificações passando (PGlite). Administrador criado. Edge Functions `ativar-professor` e `enviar-convite` publicadas (pasta `supabase/functions`, testes em Deno no CI).
- **Design:** Figma completo até a 24ª rodada. Faltam no FigJam original as seções 19 a 24.
- **App:** **Fase 0 concluída** em 28/10/2026 (PR #1). Produção em https://coachin.vercel.app. Stack: `docs/adr/0001-stack.md` (Vite + React + TypeScript, SPA na Vercel). Tokens em `src/styles/tokens.css`; componentes base em `src/ui` (catálogo em `/dev/componentes`); camada Supabase em `src/lib` (`supabase.ts`, `rpc.ts`, `erros.ts`); roteamento por papel (`src/lib/destino.ts` e `sessao.ts`, rotas `/entrar`, `/admin`, `/professor`, `/aluno`, `/sem-professor`, `/primeiro-acesso`, `/bloqueado`); CI em `.github/workflows/ci.yml`. `main` protegida (PR obrigatório e os dois jobs do CI verdes). Projeto `coachin` na Vercel com preview por PR.
- **Fatia 1 (Acesso) concluída** em 28/10/2026 (spec #8, PRs #23 a #32): login completo, criar conta e "Confirme seu e-mail", login com e-mail não confirmado, volta do link de confirmação, "Esqueci a senha" por link de 1 dia (vencido e já usado separados pela hora do pedido no link), sessão de 30 dias sem uso controlada no app (`src/lib/inatividade.ts`), "Sair" só deste aparelho e a folha "Sair do app?" pronta para o Perfil (fatia 6). Formulários com react-hook-form + zod (`src/lib/formularios.ts`). Rotas novas: `/criar-conta`, `/confirme-seu-email`, `/confirmar-email`, `/esqueci-a-senha`, `/confira-seu-email`, `/nova-senha`. As áreas dos papéis continuam provisórias ("Olá") até as fatias seguintes. Sem migration nova.
- **Fatia 2 (Convites e vínculo) concluída** em 30/10/2026 (spec #39, PRs #55 a #72): convite de aluno (abrir o link e voltar a ele depois do login, vincular, trocar de professor, recusar), primeiro acesso com aviso de dados e perfil em 2 passos, cadastro de aluno e "Convite gerado", aluno com convite pendente, expirado e recusado, lista de professores e "Convidar professor" do administrador com os estados do convite, convite de professor com conta, sem conta ("Ative seu acesso", Edge Function `ativar-professor`) e de outra conta, os casos da regra 137 e o envio do convite por e-mail com intervalo de 60 s (Edge Function `enviar-convite`). Migrations 0008 e 0009. Regras 132 a 145 (29ª rodada). A área do professor ainda é provisória (lista de alunos com convite) até a fatia 3, e a do aluno até a 5.
- **Fatia 3 (Professor: lista de alunos) concluída** em 03/11/2026 (spec #74, PRs #81, #83 e #84): `/professor` deixa de ser provisória e vira a Lista de alunos (resumo, busca sem acento e sem maiúsculas, lista vazia, "Sair" sem a fila local), com os convites (detalhe com as datas, abre a tela do aluno com convite) e os alunos vinculados (chip de status, detalhe "treinou hoje"/último treino com a ficha, chip "Pediu treino"). Migration 0010 (`last_done_letter` na view `teacher_student_list`). Regras 146 e 147. À parte, o #80 (PR #82) fechou os dois casos do convite que ficaram do #49. A tela do aluno vinculado chega com as fatias 4 e 7; a área do aluno continua provisória até a 5.

## 4. Fases

### Plano até o piloto (decidido em 05/11/2026)

**Objetivo:** um professor real monta o treino, e 2 ou 3 alunos reais fazem esse treino pelo app durante 2 semanas. O resto se decide com base nesse uso. Vale sobre a ordem da tabela da Fase 1.

| Etapa | O que entra |
|---|---|
| 1. ~~Fechar a fatia 4~~ | Concluída em 05/11/2026: criar e editar treino, arrastar, biblioteca (buscar, criar, ocultar) |
| 2. ~~Fatia 5 reduzida~~ | Concluída em 05/11/2026 (#115): Início com semana e "Ficha de hoje", ficha com exercícios e descanso, marcar como feito, desfazer, marcar dia passado, registrar carga. Menu só com o que existe, e um jeito de sair da conta |
| 3. ~~Fatia 8~~ | Concluída em 05/11/2026 (#117): PWA e fila offline (regras 38 e 116) |
| 4. Piloto | **Em andamento.** Teste de ponta a ponta dos três papéis, iPhone e Android com o app instalado, 2 semanas de uso |

Ao concluir uma etapa, risque o nome dela na tabela (~~assim~~): o ESTADO.md usa a primeira etapa sem risco como a etapa atual.

**Adiados até o piloto responder:**

- **#97** (botão "Agendar novo treino"). O #98 (treino antes do aceite, regras 122 e 153) e o #94 (ajustar medida e carga, regras 123 e 151 (4)) foram feitos antes do piloto, a pedido.
- **Fatias 6, 7 e 10** e, na fatia 5, o aviso de treinar além da frequência, a sugestão de descanso e o pop-up de treino novo.

**Antes de abrir para o público, continuam obrigatórios:** a fatia 9 e a Fase 2. No piloto, combinar o uso dos dados com os participantes e atender à exclusão de conta manualmente, se alguém pedir.

### Fase 0 · Fundação (sequencial, um agente só)

Entra tudo o que as fatias vão compartilhar. Só depois disso se paraleliza.

1. ~~**Decidir a stack**~~ Feito: `docs/adr/0001-stack.md`.
2. ~~**Tokens do `design.md`**~~ Feito: `src/styles/tokens.css`.
3. ~~**Componentes base**~~ Feito: `src/ui`, catálogo em `/dev/componentes`.
4. ~~**Camada Supabase**~~ Feito: `src/lib/supabase.ts`, `rpc.ts`, `erros.ts`.
5. ~~**Roteamento por papel**~~ Feito: `src/lib/destino.ts` e `sessao.ts`, guardas em `src/routes`.
6. ~~**Pipeline**~~ Feito: CI (`.github/workflows/ci.yml`: formato, lint, tipos, Vitest, build e testes do banco). `main` protegida e preview da Vercel em cada PR (projeto `coachin`).

Pronto quando: um "olá" autenticado roda no preview, os componentes base têm exemplos e o CI está verde.

### Fase 1 · Fatias verticais (paralelizáveis depois da Fase 0)

Cada fatia = telas + funções do banco que ela usa + testes. Ordem sugerida pelas dependências:

| # | Fatia | Depende de | Regras principais |
|---|---|---|---|
| 1 | ~~Acesso: criar conta, confirmar e-mail, login, esqueci a senha, sessão, sair~~ Concluída (#8) | Fase 0 | 39, 47 a 51, 78, 83, 88 a 90, 100, 121, 127 a 131 |
| 2 | ~~Convites e vínculo: administrador → professor; professor → aluno; primeiro acesso~~ Concluída (#39) | 1 | 46 a 49, 57, 58, 79, 82, 91 a 98, 102, 132 a 145 |
| 3 | ~~Professor: lista de alunos (o cadastro entrou na fatia 2)~~ Concluída (#74) | 2 | 54 a 59, 109, 147 |
| 4 | ~~Professor: montar e editar treino, biblioteca~~ Concluída para o piloto (#86; adiado #97; #94 e #98 feitos para o piloto; 0011 aplicada, #95 fechado) | 3 | 73 a 77, 104 a 107, 111, 118, 122 |
| 5 | ~~Aluno: início, ficha, marcar como feito, carga~~ Concluída (#115, versão reduzida do plano do piloto) | 4 | 1 a 29, 43, 110, 117 |
| 6 | Aluno: Frequência, Progressão, Histórico, Perfil | 5 | 44, 45, 85, 99 |
| 7 | Professor acompanha, solicitação de novo treino | 5 | 40, 52, 61 a 72, 103 |
| 8 | ~~PWA e fila offline~~ Concluída (#117) | 5 | 38, 116 |
| 9 | Conta: excluir, bloquear professor, tela de aluno bloqueado | 2 | 94, 95, 119, 120 |
| 10 | Cardio na ficha: colunas em `workout_days`, seção na edição da ficha e cartão na ficha do aluno | 4 e 5 | 126 |

A 8 só começa depois que a 5 estiver estável.

### Fase 2 · Antes do lançamento

- Jurídico: prazo e retenção da exclusão de conta (regra 120), dados de menores (84), telefone (108).
- Security e Performance Advisor do Supabase sem alertas novos (hoje: só índices ainda não usados, esperado em banco vazio, e políticas permissivas múltiplas, aceitas pelo desenho).
- Teste de ponta a ponta dos três papéis; teste em iOS e Android instalado na tela inicial.
- Confirmar as premissas abertas: e-mail reutilizável após excluir conta (E28), sessão de 30 dias, pop-up de treino novo.

## 5. Ciclo de cada fatia

Para cada etapa, em uma sessão só:

1. **Spec curta.** Uma issue por etapa, citando as regras pelo número. Sem quebrar em vários tickets nem escrever o texto exato de cada tela: a sessão usa as telas que existem no Figma e propõe o que faltar.
2. **Implementar com testes primeiro** (`/tdd`). Banco: teste de RLS e de função antes da migration.
3. **Mudou o banco?** Nova migration → `node supabase/tests/pglite/run.mjs` → aplicar via MCP → `generate_typescript_types` → Security Advisor → atualizar `docs/schema-coach-in.md`.
4. **Revisar.** `/code-review` completo só em banco, autenticação e permissões, com revisor separado. Nos demais casos, testes e CI bastam.
5. **PR.** `/pr`. Merge automático com CI verde, sem esperar aprovação, **exceto em banco, autenticação e permissões**, que aguardam o ok do Vinicius. (05/11/2026: o Vinicius autorizou a sessão principal a mergear sozinha nesses casos, sem pedir a cada PR.)
6. **Fechar a etapa.** Um preview do Vinicius, no celular, com a lista de textos e estados propostos para revisar.

Modelo: Sonnet como padrão; Opus só em migration, autenticação e permissões. A sessão lê só as regras da etapa, não o `contexto-produto.md` inteiro.

Problema durante o caminho: `/diagnosing-bugs`. Contexto grande demais para uma sessão: `/handoff`.

## 6. Trabalho em paralelo

- **Sem paralelo e sem sessão coordenadora:** uma etapa de cada vez, em worktree próprio. Ninguém trabalha na `main` direto.
- **Migrations:** uma por vez, com o número conferido antes de começar. Quem aplica roda os testes inteiros depois.
- **Componentes base:** a sessão da etapa cria o que precisar em `src/ui`, seguindo o `design.md`.
- **Numeração de regras:** a próxima é a **166** (a 164 está reservada no PR #136, ainda aberto; a 165 já está na `main`).

## 7. Quando uma regra de negócio muda ou aparece

1. **Regra de negócio:** quem encontrou a dúvida pergunta ao Vinicius (issue `needs-info` ou na própria sessão), sem decidir sozinho. A decisão vira regra numerada em `contexto-produto.md`, com data.
2. **Texto ou estado pequeno:** a sessão propõe, anota na lista da etapa e segue. Só vira regra se mudar o comportamento do negócio.
3. **Efeitos:** ajustar o que a decisão atingir (`design.md`, `docs/schema-coach-in.md` e migration nova, código).

## 8. Sincronizar os documentos

- **Edição:** sempre no repositório (`docs/contexto/`).
- **Project do claude.ai:** não é mais espelhado. O que estiver lá pode estar desatualizado; decisão tomada lá precisa entrar no repositório para valer. Os chats do Project leem, no começo de cada conversa, `ESTADO.md` e `INDICE-REGRAS.md` da branch `claude-estado` (gerados por `.github/workflows/estado.yml`; URL: https://raw.githubusercontent.com/viniciushp01/coachin/claude-estado/ESTADO.md). O texto das instruções do Project fica versionado em `docs/agents/instrucoes-do-project.md`.
- **Figma:** referência visual, sem obrigação de desenhar cada caso raro. Mudança de texto decidida no código não exige atualização imediata.

## 9. Definição de pronto (qualquer ticket)

- [ ] Atende às regras citadas, sem regra nova inventada.
- [ ] Segue o `design.md` e as telas que existem no Figma (tokens, componentes, um botão laranja por tela, textos em pt-BR, tom acolhedor).
- [ ] Testes passando; mudança de banco com migration nova, testada e aplicada pelo Claude Code.
- [ ] Security Advisor sem alerta novo.
- [ ] Tipos do banco regerados, se o banco mudou.
- [ ] Docs atualizados (`contexto-produto.md`, `design.md`, `schema-coach-in.md`, conforme o caso).
- [ ] CI verde. Preview no celular uma vez por etapa (seção 5).

## 10. Pendências conhecidas

- Sem caso real ainda: ocultar exercício do catálogo para todos (regra 148; `exercise_hidden` é por professor).
- O nome do job do banco no CI ainda diz "239 verificações".
- Fatia 1: links de confirmação enviados antes do PR #31 voltam para `/entrar` e entram direto (só contas de teste); SMTP do Gmail a trocar por provedor transacional antes do lançamento (Fase 2).
- Figma: o frame "Login · 2 Erro de credenciais" diz "E-mail ou senha incorretos"; o texto decidido é "E-mail ou senha não conferem." (corrigir no Figma).
- Figma: página "↳ Fluxo · Conta e privacidade" com frames antigos sobrepostos; toques numerados e raia própria para os frames novos da 24ª rodada.
- Fatia 9 (excluir conta): apagar os rascunhos guardados no aparelho com `limparRascunhos(conta, () => false)` (regra 162).
- Regra 164 (#135), propostas: a linha da Lista do aluno sem convite diz "Convite ainda não enviado" (texto do aviso da tela dele); a mensagem de `invite_already_sent` é "O convite já foi enviado. Use Reenviar convite.". O Figma (Convite do aluno · 8 e 9) mostra "Corrigir e-mail" no aluno sem convite: ficou de fora, porque mudar o e-mail está fora da #135 e pede função nova; e "Agendar novo treino" segue com o #97.
- Jurídico (Fase 2).
