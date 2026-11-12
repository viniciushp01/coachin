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

- **Produto:** regras 1 a 168 (a última é a 168, "Solicitar novo treino" só na última semana; o número vivo está no `ESTADO.md`). Nenhum ponto bloqueando o piloto. Pendências menores na seção 8 do `contexto-produto.md`.
- **Banco:** migrations 0001 a 0016 aplicadas (a última, `20261112145537_my_request_status`) no Supabase (`kfjjiajxgbsqpuskxbzb`) e iguais às do repositório (a 0007 e a 0012 entraram pelo SQL Editor; ver `docs/schema-coach-in.md`). 408 verificações passando (PGlite). Administrador criado. Edge Functions `ativar-professor` e `enviar-convite` publicadas (pasta `supabase/functions`, testes em Deno no CI).
- **Design:** Figma completo até a 24ª rodada. Faltam no FigJam original as seções 19 a 24.
- **App:** **Fase 0 concluída** em 28/10/2026 (PR #1). Produção em https://coachin.vercel.app. Stack: `docs/adr/0001-stack.md` (Vite + React + TypeScript, SPA na Vercel). Tokens em `src/styles/tokens.css`; componentes base em `src/ui` (catálogo em `/dev/componentes`); camada Supabase em `src/lib` (`supabase.ts`, `rpc.ts`, `erros.ts`); roteamento por papel (`src/lib/destino.ts` e `sessao.ts`, rotas `/entrar`, `/admin`, `/professor`, `/aluno`, `/sem-professor`, `/primeiro-acesso`, `/bloqueado`); CI em `.github/workflows/ci.yml`. `main` protegida (PR obrigatório e os dois jobs do CI verdes). Projeto `coachin` na Vercel com preview por PR.
- **Fatia 1 (Acesso) concluída** em 28/10/2026 (spec #8, PRs #23 a #32): login completo, criar conta e "Confirme seu e-mail", login com e-mail não confirmado, volta do link de confirmação, "Esqueci a senha" por link de 1 dia (vencido e já usado separados pela hora do pedido no link), sessão de 30 dias sem uso controlada no app (`src/lib/inatividade.ts`), "Sair" só deste aparelho e a folha "Sair do app?" pronta para o Perfil (fatia 6). Formulários com react-hook-form + zod (`src/lib/formularios.ts`). Rotas novas: `/criar-conta`, `/confirme-seu-email`, `/confirmar-email`, `/esqueci-a-senha`, `/confira-seu-email`, `/nova-senha`. As áreas dos papéis continuam provisórias ("Olá") até as fatias seguintes. Sem migration nova.
- **Fatia 2 (Convites e vínculo) concluída** em 30/10/2026 (spec #39, PRs #55 a #72): convite de aluno (abrir o link e voltar a ele depois do login, vincular, trocar de professor, recusar), primeiro acesso com aviso de dados e perfil em 2 passos, cadastro de aluno e "Convite gerado", aluno com convite pendente, expirado e recusado, lista de professores e "Convidar professor" do administrador com os estados do convite, convite de professor com conta, sem conta ("Ative seu acesso", Edge Function `ativar-professor`) e de outra conta, os casos da regra 137 e o envio do convite por e-mail com intervalo de 60 s (Edge Function `enviar-convite`). Migrations 0008 e 0009. Regras 132 a 145 (29ª rodada). A área do professor ainda é provisória (lista de alunos com convite) até a fatia 3, e a do aluno até a 5.
- **Fatia 3 (Professor: lista de alunos) concluída** em 03/11/2026 (spec #74, PRs #81, #83 e #84): `/professor` deixa de ser provisória e vira a Lista de alunos (resumo, busca sem acento e sem maiúsculas, lista vazia, "Sair" sem a fila local), com os convites (detalhe com as datas, abre a tela do aluno com convite) e os alunos vinculados (chip de status, detalhe "treinou hoje"/último treino com a ficha, chip "Pediu treino"). Migration 0010 (`last_done_letter` na view `teacher_student_list`). Regras 146 e 147. À parte, o #80 (PR #82) fechou os dois casos do convite que ficaram do #49. A tela do aluno vinculado chega com as fatias 4 e 7; a área do aluno continua provisória até a 5.
- **Fatia 7a (Professor acompanha o aluno, só leitura) concluída** em 12/11/2026 (#141): os quatro atalhos da tela do aluno (só Perfil e Histórico sem treino ativo, como no Figma), Calendário mensal com painel do dia e ficha em modo leitura, Progressão de carga (lista e detalhe com histórico), Histórico de treinos e Perfil com "Abrir WhatsApp". Sem migration (a RLS do professor já cobria as leituras). Componente novo `MonthDay`. A 7b (solicitação de novo treino) continua pendente.
- **Fatia 7b (Solicitação de novo treino) feita** em 12/11/2026 (#143, PR #144 mergeado e migration 0016 aplicada): o aluno pede um novo treino na home e na tela sem treino, cancela enquanto o professor não agiu (folha de confirmação, toast) e vê a folha "Sem conexão" sem internet; o professor vê o chip e o aviso do pedido na tela do aluno, o aviso de pedido cancelado (regra 166) e, se o pedido for cancelado durante a montagem, o aviso no topo das fichas com o link do WhatsApp. Migration 0016 (`my_request_status`). A regra 35 foi substituída pela 167, e a regra 168 limita o botão da home à última semana e ao depois do fim.

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
- **Fatias 6 e 10** (a 7a, acompanhar o aluno em só leitura, e a 7b, solicitação de novo treino, foram feitas antes do piloto, #141 e #143) e, na fatia 5, o aviso de treinar além da frequência, a sugestão de descanso e o pop-up de treino novo.

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
| 7 | Professor acompanha, solicitação de novo treino. **7a ~~calendário, progressão, histórico e perfil, só leitura~~ concluída (#141)**; **7b ~~solicitação de novo treino (40, 52, 62, 70, 103)~~ feita (#143)** | 5 | 40, 52, 61 a 72, 103 |
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
- **Numeração de regras:** a próxima está no `ESTADO.md` ("Próxima regra"), calculada a partir do `contexto-produto.md`. Não escreva o número aqui: ele envelhece a cada regra.

## 7. Quando uma regra de negócio muda ou aparece

1. **Regra de negócio:** quem encontrou a dúvida pergunta ao Vinicius (issue `needs-info` ou na própria sessão), sem decidir sozinho. A decisão vira regra numerada em `contexto-produto.md`, com data.
2. **Texto ou estado pequeno:** a sessão propõe, anota na lista da etapa e segue. Só vira regra se mudar o comportamento do negócio.
3. **Efeitos:** ajustar o que a decisão atingir (`design.md`, `docs/schema-coach-in.md` e migration nova, código).

## 8. Sincronizar os documentos

- **Edição:** sempre no repositório (`docs/contexto/`).
- **Project do claude.ai:** não é mais espelhado. O que estiver lá pode estar desatualizado; decisão tomada lá precisa entrar no repositório para valer. Os chats do Project leem, no começo de cada conversa, `ESTADO.md` e `INDICE-REGRAS.md` da branch `claude-estado` (gerados por `.github/workflows/estado.yml`; URL: https://raw.githubusercontent.com/viniciushp01/coachin/claude-estado/ESTADO.md). O texto das instruções do Project fica versionado em `docs/agents/instrucoes-do-project.md`.
- **Documentação sempre atualizada (regra permanente):** o repositório alimenta tudo (Project do claude.ai via `ESTADO.md`, pasta local por `git pull`). Todo PR que muda comportamento, regra, tela, banco, plano ou fluxo de trabalho atualiza, **no mesmo PR**, os documentos que ele atinge: `contexto-produto.md` (regra numerada), `design.md`, `schema-coach-in.md` (e a lista de migrations aplicadas no `CLAUDE.md`), a tabela e o resumo de fatias da seção 4 deste arquivo e as pendências da seção 10. Ao fechar a tarefa, confira se algum documento ficou dizendo o contrário do código. O `ESTADO.md` é gerado (não edite) e já avisa quando o WORKFLOW diverge. Mudou o texto das instruções do Project? Edite `docs/agents/instrucoes-do-project.md` e avise o Vinicius para colar de novo no claude.ai, o único texto que não se atualiza sozinho.
- **Figma:** referência visual, sem obrigação de desenhar cada caso raro. Mudança de texto decidida no código não exige atualização imediata.

## 9. Definição de pronto (qualquer ticket)

- [ ] Atende às regras citadas, sem regra nova inventada.
- [ ] Segue o `design.md` e as telas que existem no Figma (tokens, componentes, um botão laranja por tela, textos em pt-BR, tom acolhedor).
- [ ] Testes passando; mudança de banco com migration nova, testada e aplicada pelo Claude Code.
- [ ] Security Advisor sem alerta novo.
- [ ] Tipos do banco regerados, se o banco mudou.
- [ ] Docs atualizados **no mesmo PR** (`contexto-produto.md`, `design.md`, `schema-coach-in.md`, tabela de fatias e pendências do WORKFLOW, lista de migrations do `CLAUDE.md`, conforme o caso). Nada mudou nos docs? Diga no PR por quê (seção 8).
- [ ] CI verde. Preview no celular uma vez por etapa (seção 5).

## 10. Pendências conhecidas

- Sem caso real ainda: ocultar exercício do catálogo para todos (regra 148; `exercise_hidden` é por professor).
- O nome do job do banco no CI ainda diz "239 verificações".
- Fatia 1: links de confirmação enviados antes do PR #31 voltam para `/entrar` e entram direto (só contas de teste); SMTP do Gmail a trocar por provedor transacional antes do lançamento (Fase 2).
- Figma: o frame "Login · 2 Erro de credenciais" diz "E-mail ou senha incorretos"; o texto decidido é "E-mail ou senha não conferem." (corrigir no Figma).
- Figma: página "↳ Fluxo · Conta e privacidade" com frames antigos sobrepostos; toques numerados e raia própria para os frames novos da 24ª rodada.
- Fatia 9 (excluir conta): apagar os rascunhos guardados no aparelho com `limparRascunhos(conta, () => false)` (regra 162).
- Regra 164 (#135), propostas: a linha da Lista do aluno sem convite diz "Convite ainda não enviado" (texto do aviso da tela dele); a mensagem de `invite_already_sent` é "O convite já foi enviado. Use Reenviar convite.". O Figma (Convite do aluno · 8 e 9) mostra "Corrigir e-mail" no aluno sem convite: ficou de fora, porque mudar o e-mail está fora da #135 e pede função nova; e "Agendar novo treino" segue com o #97.
- Fatia 7b (#143), propostas: (1) a folha "Sem conexão" do pedido usa o mesmo texto ao pedir e ao cancelar ("Para pedir um novo treino, conecte-se à internet. Seu treino continua disponível para leitura."); (2) pedir não mostra toast (o botão vira "Solicitação enviada"); (3) o estado do pedido vai na cópia do treino guardada no aparelho; cópia antiga, sem ele, vale "sem pedido"; (4) a montagem relê o pedido ao abrir a etapa de fichas e quando a aba volta a ficar visível, sem tempo real, e só se o pedido estava aberto ao entrar; um rascunho retomado depois de o pedido ser cancelado não mostra o aviso (o aviso da tela do aluno já mostra); (5) o link do WhatsApp usa o telefone do perfil e, sem ele, o do cadastro; sem nenhum, o aviso aparece sem o link; (6) se o professor agiu entre a leitura e o toque em cancelar, aparece o erro "Seu professor já atendeu o pedido." e a home se atualiza; (7) no professor, o aviso de pedido aberto aparece também quando ele já agendou o treino (o pedido segue aberto até o treino ficar ativo, regra 40).
- Supabase Auth, antes de abrir ao público (WARN do Security Advisor de 12/11/2026): validade do OTP maior que 1 hora (hoje 86400 s, por decisão) e proteção contra senhas vazadas desligada (decidido em 12/11/2026: não ligar por ora, basta a proteção básica do plano gratuito; o WARN fica aceito). Detalhe em `contexto-produto.md`, seção 8.
- Jurídico (Fase 2).
