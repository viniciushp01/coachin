# Coach In · Workflow de desenvolvimento

Como produto, design e código andam juntos. Leia este arquivo antes de planejar trabalho novo. Ele não repete regras de negócio (vivem em `docs/contexto/contexto-produto.md`) nem o desenho do banco (`docs/schema-coach-in.md`).

Última verificação do estado: 28/10/2026.

## 1. Princípios

1. **O repositório é a fonte da verdade.** O Project "Coach In" no claude.ai é um espelho para os chats de produto e design. Sincroniza-se numa direção só: repositório → Project, ao fim de cada rodada (seção 8).
2. **Documento, não conversa.** Cada agente começa do zero e só sabe o que está em arquivo. Decisão que não foi escrita não existe.
3. **Ninguém inventa regra de negócio.** Dúvida vira pergunta; decisão vira regra numerada em `contexto-produto.md`.
4. **Só o Claude Code aplica migrations.** Os chats de produto desenham, revisam e testam, mas não aplicam. Migration aplicada nunca se edita: cria-se uma nova.
5. **Tela e banco da mesma fatia andam juntos.** Nada de tabela sem tela que a use, nem tela sem teste de acesso (RLS) por trás.
6. **Um único dono para o que é compartilhado** (componentes base, migrations, numeração de regras). Isso evita cinco botões diferentes e dois `0007`.

## 2. Quem faz o quê

| Quem | Faz | Não faz |
|---|---|---|
| **Você** | Decide produto, aprova entregas, conversa com o jurídico, renomeia o Project | Aplicar migration à mão |
| **Claude no app (chats do Project)** | Decide e registra regras, desenha no Figma, escreve e revisa schema, responde dúvidas de produto | Aplicar migration; editar código do app |
| **Claude Code (repositório)** | Código do app, migrations, testes, tipos, PRs, deploy | Inventar regra; mudar design sem registrar |

Os dois lados conversam por **arquivos**: pendências voltam para `contexto-produto.md` (seção "Pontos em aberto") e para issues.

## 3. Estado atual (28/10/2026)

- **Produto:** regras 1 a 130 (28ª rodada). Nenhum ponto bloqueando o MVP. Pendências menores na seção 8 do `contexto-produto.md`.
- **Banco:** migrations 0001 a 0006 aplicadas no Supabase (`kfjjiajxgbsqpuskxbzb`) e iguais às do repositório. 239 verificações passando (PGlite). Administrador criado.
- **Design:** Figma completo até a 24ª rodada. Faltam no FigJam original as seções 19 a 24.
- **App:** **Fase 0 concluída** em 28/10/2026 (PR #1). Produção em https://coachin.vercel.app. Stack: `docs/adr/0001-stack.md` (Vite + React + TypeScript, SPA na Vercel). Tokens em `src/styles/tokens.css`; componentes base em `src/ui` (catálogo em `/dev/componentes`); camada Supabase em `src/lib` (`supabase.ts`, `rpc.ts`, `erros.ts`); roteamento por papel (`src/lib/destino.ts` e `sessao.ts`, rotas `/entrar`, `/admin`, `/professor`, `/aluno`, `/sem-professor`, `/primeiro-acesso`, `/bloqueado`); CI em `.github/workflows/ci.yml`. `/entrar` é mínima e as áreas são provisórias ("Olá"), até as fatias. `main` protegida (PR obrigatório e os dois jobs do CI verdes). Projeto `coachin` na Vercel com preview por PR.

## 4. Fases

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
| 1 | Acesso: criar conta, confirmar e-mail, login, esqueci a senha, sessão, sair | Fase 0 | 39, 47 a 51, 78, 83, 88 a 90, 100, 121 |
| 2 | Convites e vínculo: administrador → professor; professor → aluno; primeiro acesso | 1 | 46 a 49, 79, 82, 91 a 98, 102 |
| 3 | Professor: lista de alunos e cadastro | 2 | 54 a 59, 109 |
| 4 | Professor: montar e editar treino, biblioteca | 3 | 73 a 77, 104 a 107, 111, 118, 122 |
| 5 | Aluno: início, ficha, marcar como feito, carga | 4 | 1 a 29, 43, 110, 117 |
| 6 | Aluno: Frequência, Progressão, Histórico, Perfil | 5 | 44, 45, 85, 99 |
| 7 | Professor acompanha, solicitação de novo treino | 5 | 40, 52, 61 a 72, 103 |
| 8 | PWA e fila offline | 5 | 38, 116 |
| 9 | Conta: excluir, bloquear professor, tela de aluno bloqueado | 2 | 94, 95, 119, 120 |
| 10 | Cardio na ficha: colunas em `workout_days`, seção na edição da ficha e cartão na ficha do aluno | 4 e 5 | 126 |

As fatias 3 e 4 (professor) e 5 e 6 (aluno) são independentes entre si depois de 2, e podem andar em paralelo. A 8 só começa depois que a 5 estiver estável.

### Fase 2 · Antes do lançamento

- Jurídico: prazo e retenção da exclusão de conta (regra 120), dados de menores (84), telefone (108).
- Security e Performance Advisor do Supabase sem alertas novos (hoje: só índices ainda não usados, esperado em banco vazio, e políticas permissivas múltiplas, aceitas pelo desenho).
- Teste de ponta a ponta dos três papéis; teste em iOS e Android instalado na tela inicial.
- Confirmar as premissas abertas: e-mail reutilizável após excluir conta (E28), sessão de 30 dias, pop-up de treino novo.

## 5. Ciclo de cada fatia

Para cada fatia, nesta ordem. As skills já instaladas em `.claude/skills/` cobrem os passos.

1. **Mapa e tickets.** `/wayfinder` (se a fatia for grande) ou `/to-spec` e `/to-tickets` para quebrar em tickets com dependências no GitHub Issues. Cada ticket cita as regras pelo número.
2. **Conferir design.** O ticket aponta as páginas do Figma (`docs/contexto/figma-paginas.md`). Falta tela ou componente? Volta para o chat de design (seção 7), não se improvisa.
3. **Implementar com testes primeiro.** `/implement` com `/tdd`. Banco: teste de RLS e de função antes da migration.
4. **Mudou o banco?** Nova migration → `node supabase/tests/pglite/run.mjs` → só então aplicar via MCP → `generate_typescript_types` → rodar Security Advisor → atualizar `docs/schema-coach-in.md`.
5. **Revisar.** `/code-review` contra as regras numeradas e o `design.md`. Para trabalho sensível (RLS, auth, exclusão de conta), um revisor separado, que não viu a implementação.
6. **PR.** `/pr`, com as regras atendidas, as telas do Figma e o resultado dos testes.
7. **Fechar.** Merge, preview conferido no celular, issues fechadas, docs atualizados (seção 8).

Problema durante o caminho: `/diagnosing-bugs`. Fim de fatia: `/retro`. Contexto grande demais para uma sessão: `/handoff`.

## 6. Trabalho em paralelo

- **Um agente por ticket, um worktree por agente** (`git worktree` ou o recurso de worktree do Claude Code), branch `fatia-N/ticket`. Ninguém trabalha na `main` direto.
- **Migrations:** reservar o número antes de começar (issue "migration 0007 reservada para #N"). Só um agente aplica por vez, e quem aplica roda os testes inteiros depois.
- **Componentes base:** pertencem à Fase 0. Precisa de um novo? Ticket próprio, feito por um agente, mergeado antes de quem depende dele.
- **Numeração de regras e rodadas:** quem decide produto reserva a faixa. Hoje a próxima regra é a **131** e a próxima rodada é a **29ª**. Dois chats de produto ao mesmo tempo precisam combinar faixas antes (foi o que quase colidiu nos lotes 3 e 4).
- **Revisor de consistência** ao fim de cada onda paralela: confere cada entrega contra as regras e o design system, e só o que passa chega a você.

## 7. Quando uma regra de negócio muda ou aparece

1. Quem encontrou a dúvida abre um issue `needs-info` com o trecho da regra e a pergunta (nunca decide sozinho).
2. **Chat de produto** (Project) conversa com você e fecha a decisão.
3. A decisão vira regra numerada em `contexto-produto.md` (nova rodada, com data), e os pontos afetados nas seções 2 a 7 do mesmo arquivo são ajustados.
4. Design: telas novas ou alteradas no Figma, componentes novos registrados na Parte 2 do `design.md`, mapa em `figma-paginas.md` ou num `rodada-NN`.
5. Banco: `docs/schema-coach-in.md` + migration nova, se houver.
6. Código: ticket novo ou existente atualizado.
7. Sincronizar com o Project (seção 8).

## 8. Sincronizar os documentos

- **Edição:** sempre no repositório (`docs/contexto/`). No Project, os caminhos aparecem como `claude/...`; no repositório, como `docs/contexto/...`.
- **Espelho no Project:** ao fim de cada rodada, copiar `docs/contexto/*.md` para o Project trocando `docs/contexto/` por `claude/`. Quem fez a rodada faz a cópia e confere a data de cabeçalho.
- **Figma e FigJam:** uma seção "Decisões - NNª rodada" por rodada. Pendente hoje: replicar as seções 19 a 24 no board original (`JNuuAUgUlhLvia1HZ5X3xO`).
- **Nunca** deixar o Project à frente do repositório: se alguém editar lá por engano, trazer a mudança para o repositório antes da próxima rodada.

## 9. Definição de pronto (qualquer ticket)

- [ ] Atende às regras citadas, sem regra nova inventada.
- [ ] Igual ao Figma (tokens, componentes, um botão laranja por tela, textos em pt-BR, tom acolhedor).
- [ ] Testes passando; mudança de banco com migration nova, testada e aplicada pelo Claude Code.
- [ ] Security Advisor sem alerta novo.
- [ ] Tipos do banco regerados, se o banco mudou.
- [ ] Docs atualizados (`contexto-produto.md`, `design.md`, `schema-coach-in.md`, conforme o caso).
- [ ] PR revisado e preview conferido no celular.

## 10. Pendências conhecidas

- Abrir os tickets da Fase 1, começando pela fatia 1 (Acesso), que completa a tela /entrar.
- Figma: o frame "Login · 2 Erro de credenciais" diz "E-mail ou senha incorretos"; o texto decidido é "E-mail ou senha não conferem." (corrigir no Figma).
- Renomear o Project de "Gym App" para "Coach In" (só você consegue).
- FigJam original: replicar seções 19 a 24.
- Figma: página "↳ Fluxo · Conta e privacidade" com frames antigos sobrepostos; toques numerados e raia própria para os frames novos da 24ª rodada.
- Jurídico (Fase 2).
