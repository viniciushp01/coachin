# Coach In

Aplicativo de treinos de academia gerenciado por um professor (MVP: apenas musculação).

Antes de trabalhar, leia em `docs/contexto/contexto-produto.md` **só as regras da etapa** (busque pelo número): ele consolida o modelo de dados, as regras de negócio numeradas, as telas, os fluxos e a priorização, e é grande demais para ler inteiro a cada sessão.

- Siga as regras do `docs/contexto/contexto-produto.md`; não invente regra de negócio sem confirmar. Textos e estados pequenos: proponha e anote na lista da etapa (`docs/WORKFLOW.md`, seção 7).
- Se algo conflitar ou estiver nos "Pontos em aberto", pergunte antes de implementar.
- Respostas e textos do app em português (pt-BR).

## Como trabalhamos

Leia `docs/WORKFLOW.md` antes de planejar trabalho novo, sobretudo o **plano até o piloto** (seção 4) e o ciclo enxuto (seção 5): uma sessão por etapa, sem paralelo, Sonnet como padrão, merge automático com CI verde exceto em banco, autenticação e permissões. O repositório é a fonte da verdade, só o Claude Code aplica migrations, e ninguém inventa regra de negócio.

## Economia de tokens (vale para toda tarefa)

Gastar menos sem baixar a qualidade: corte leitura e repetição, nunca testes, CI ou a definição de pronto do WORKFLOW.

- **Uma sessão por ticket ou PR**, aberta em `C:\dev\CoachIn`. Terminou, encerra; a próxima tarefa começa em sessão nova. O que precisa passar adiante vai para o ticket, o PR ou `/handoff`, não para o histórico.
- **Ler sob demanda.** Não leia `contexto-produto.md` nem `design.md` inteiros: busque (Grep) as regras e os componentes que o ticket cita e leia só esses trechos. Releia um arquivo só se ele mudou.
- **Ticket autossuficiente.** Todo ticket cita regras por número, páginas do Figma e arquivos tocados. Faltou algo, complete o ticket antes de começar, para o próximo agente não refazer a busca.
- **Subagentes e revisões na medida.** PR pequeno ou mecânico: CI verde + autorrevisão. Revisão em agente separado só para RLS, auth, migration, exclusão de conta ou PR grande. Não abra sessão ou subagente para pesquisa que um Grep resolve.
- **Figma e navegador econômicos.** Prefira ler dados (textos, medidas via `figma_execute`) a capturas; captura só da seção do ticket, com `scale` baixo. No navegador, `get_page_text`/JavaScript antes de screenshot.
- **Comandos enxutos.** Rode verificações juntas e filtre a saída (`tail`, `grep`); não repita o que o CI já confere.
- **Modelo certo para a tarefa.** Textos, issues, ajustes pequenos e docs: modelo mais barato ou esforço menor. Banco, RLS, arquitetura e decisões difíceis: o modelo mais forte.
- **Perguntas em lote.** Junte as dúvidas numa só pergunta ou num só issue `needs-info`.

## Stack

Decidida em `docs/adr/0001-stack.md` (Vite + React + TypeScript, SPA na Vercel, Tailwind v4 com os tokens do `design.md`, TanStack Router e Query, vite-plugin-pwa, idb). Leia antes de escrever código do app.

## Documentos de apoio (`docs/contexto/`)

- `design.md`: design system (tokens, tipografia, componentes e regras de montagem). Leia antes de criar qualquer tela ou código de interface.
- `docs/agents/instrucoes-do-project.md`: texto versionado das instruções do Project "Coach In" no claude.ai (os chats leem o `ESTADO.md` da branch `claude-estado`).
- `figma-paginas.md`: mapa de páginas do arquivo Figma "Coach In" (manda sobre os nomes citados nos outros arquivos).
- `handoff-design-system.md`: convenções visuais e manhas do plugin do Figma.
- `prompts-lotes-3-e-4.md`: prompts usados nos lotes 3 e 4 do design (referência histórica).
- `rodada-19`, `rodada-22`, `rodada-23` e `rodada-24` (as rodadas 25 e 26 são só regras, 122 e 123 a 125, sem mapa do Figma; a 28ª (regras 127 a 131) tem a seção 12 de "Aluno · Entrada"; a 27ª, regra 126, tem as telas na página "Aluno · Ficha e painel do dia" e "Professor · Treino"): mapa do Figma e pendências de cada rodada de casos de borda (as regras em si estão no `contexto-produto.md`).

O **repositório é a fonte da verdade**: edite em `docs/contexto/`. O Project do claude.ai não é mais espelhado (`docs/WORKFLOW.md`, seção 8).

## Agent skills

### Issue tracker

Issues em GitHub Issues (`viniciushp01/coachin`), via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Labels padrão (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

## Banco de dados (Supabase)

- Projeto Supabase: `coach-in-app` (ref `kfjjiajxgbsqpuskxbzb`, região sa-east-1), já configurado em `.mcp.json`. Estava **vazio** quando as migrations foram escritas.
- Leia `docs/schema-coach-in.md` antes de mexer no banco ou em qualquer chamada ao Supabase. Ele explica o desenho, quem enxerga o quê, a lista de funções e as 12 decisões a confirmar (seção 5).
- Migrations em `supabase/migrations/` (ordem pelo timestamp do nome, 0001 a 0014; a 0011, do #94, é a última pelo timestamp). 0001 a 0005 **aplicadas em 27/10/2026**, 0006 (regra 122, treino antes do aceite) **em 28/10/2026** e 0008 (regras 133 e 134, prévia do convite) **em 29/10/2026**, 0009 (regras 139 e 140, envio do convite por e-mail) **em 30/10/2026** e 0010 (regra 147, ficha do último treino na lista) **em 03/11/2026**, e 0007 (catálogo, PR #4) também em 03/11/2026, depois da 0010 e pelo SQL Editor, e 0012 (regras 149 e 154, limites de `save_workout`, #100) **em 04/11/2026**, também pelo SQL Editor, porque o `apply_migration` do MCP as recusou sem mostrar tela (detalhes em `docs/schema-coach-in.md`), e 0013 (regra 157, ordem e ocultos em `similar_exercises`, #93) e 0014 (token curto do convite, #118) e 0011 (regras 123 e 148, `set_exercise_settings`, #94) **em 05/11/2026**; as demais via MCP (gatilho de `auth.users`, excluir conta e bloquear professor testados no projeto real; Security Advisor rodado). Administrador criado. Tipos TypeScript em `supabase/database.types.ts`; gere de novo a cada mudança no banco.
- Testes locais do banco: `bash supabase/tests/run.sh` (precisa de Postgres 16 e de Linux/WSL/macOS; sobe um banco descartável; deve terminar com "TODOS OS TESTES PASSARAM"). `00_stub_supabase.sql` simula a autenticação e **nunca** deve ser aplicado no Supabase real.
- No Windows (sem Postgres/WSL/Docker): `npm --prefix supabase/tests/pglite install` e depois `node supabase/tests/pglite/run.mjs` (Postgres 17 em WebAssembly via PGlite, mesmos arquivos e mesma saída).
- Regras do desenho: o app só **lê** tabelas; **toda escrita** passa por funções (RPC) que validam papel e regra de negócio. Não crie `insert/update/delete` direto de tabela no app, nem papel em `user_metadata`. Erros das funções são códigos curtos (ex.: `invite_expired`) que o app traduz para pt-BR em `src/lib/erros.ts` (um teste falha se uma migration lançar código sem tradução). No app, escrita só por `rpc()` de `src/lib/rpc.ts`; leitura pelo cliente de `src/lib/supabase.ts`.
- Ambiente local: copie `.env.example` para `.env.local` (só valores públicos: URL e chave publicável). Testes do app: `npm test`; do banco: `npm run test:db`.
- Mudou o banco? Crie uma **nova** migration (nunca edite uma já aplicada), rode os testes e atualize `docs/schema-coach-in.md`. Só um lado (este chat ou o Claude Code) aplica migrations, para não gerar conflito: o Claude Code.
