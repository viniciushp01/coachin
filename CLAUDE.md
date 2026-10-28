# Coach In

Aplicativo de treinos de academia gerenciado por um professor (MVP: apenas musculação).

Antes de qualquer trabalho de produto, design ou código, leia `docs/contexto/contexto-produto.md`: ele consolida o modelo de dados, as regras de negócio (numeradas), as telas, os fluxos e a priorização MVP x Depois, atualizado até a 28ª rodada de decisões (28/10/2026). A fonte original é o board do Figma (https://www.figma.com/board/JNuuAUgUlhLvia1HZ5X3xO/Aplicativo-de-treinos---MVP).

- Siga as regras do `docs/contexto/contexto-produto.md`; não invente regras novas sem confirmar.
- Se algo conflitar ou estiver nos "Pontos em aberto", pergunte antes de implementar.
- Respostas e textos do app em português (pt-BR).

## Como trabalhamos

Leia `docs/WORKFLOW.md` antes de planejar trabalho novo: papéis, fases, ciclo de cada fatia, trabalho em paralelo e sincronização dos documentos. Resumo: o repositório é a fonte da verdade, só o Claude Code aplica migrations, e ninguém inventa regra de negócio.

## Stack

Decidida em `docs/adr/0001-stack.md` (Vite + React + TypeScript, SPA na Vercel, Tailwind v4 com os tokens do `design.md`, TanStack Router e Query, vite-plugin-pwa, idb). Leia antes de escrever código do app.

## Documentos de apoio (`docs/contexto/`)

- `design.md`: design system (tokens, tipografia, componentes e regras de montagem). Leia antes de criar qualquer tela ou código de interface.
- `figma-paginas.md`: mapa de páginas do arquivo Figma "Coach In" (manda sobre os nomes citados nos outros arquivos).
- `handoff-design-system.md`: convenções visuais e manhas do plugin do Figma.
- `prompts-lotes-3-e-4.md`: prompts usados nos lotes 3 e 4 do design (referência histórica).
- `rodada-19`, `rodada-22`, `rodada-23` e `rodada-24` (as rodadas 25 e 26 são só regras, 122 e 123 a 125, sem mapa do Figma; a 28ª (regras 127 a 131) tem a seção 12 de "Aluno · Entrada"; a 27ª, regra 126, tem as telas na página "Aluno · Ficha e painel do dia" e "Professor · Treino"): mapa do Figma e pendências de cada rodada de casos de borda (as regras em si estão no `contexto-produto.md`).

O **repositório é a fonte da verdade**: edite em `docs/contexto/` e espelhe no Project "Coach In" do claude.ai ao fim de cada rodada (no Project os caminhos são `claude/...`). Detalhes em `docs/WORKFLOW.md`, seção 8.

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
- Migrations em `supabase/migrations/` (ordem numérica, 0001 a 0006). 0001 a 0005 **aplicadas em 27/10/2026** e 0006 (regra 122, treino antes do aceite) **em 28/10/2026**, via MCP (gatilho de `auth.users`, excluir conta e bloquear professor testados no projeto real; Security Advisor rodado). Administrador criado. Tipos TypeScript em `supabase/database.types.ts`; gere de novo a cada mudança no banco.
- Testes locais do banco: `bash supabase/tests/run.sh` (precisa de Postgres 16 e de Linux/WSL/macOS; sobe um banco descartável; deve terminar com "TODOS OS TESTES PASSARAM"). `00_stub_supabase.sql` simula a autenticação e **nunca** deve ser aplicado no Supabase real.
- No Windows (sem Postgres/WSL/Docker): `npm --prefix supabase/tests/pglite install` e depois `node supabase/tests/pglite/run.mjs` (Postgres 17 em WebAssembly via PGlite, mesmos arquivos e mesma saída).
- Regras do desenho: o app só **lê** tabelas; **toda escrita** passa por funções (RPC) que validam papel e regra de negócio. Não crie `insert/update/delete` direto de tabela no app, nem papel em `user_metadata`. Erros das funções são códigos curtos (ex.: `invite_expired`) que o app traduz para pt-BR em `src/lib/erros.ts` (um teste falha se uma migration lançar código sem tradução). No app, escrita só por `rpc()` de `src/lib/rpc.ts`; leitura pelo cliente de `src/lib/supabase.ts`.
- Ambiente local: copie `.env.example` para `.env.local` (só valores públicos: URL e chave publicável). Testes do app: `npm test`; do banco: `npm run test:db`.
- Mudou o banco? Crie uma **nova** migration (nunca edite uma já aplicada), rode os testes e atualize `docs/schema-coach-in.md`. Só um lado (este chat ou o Claude Code) aplica migrations, para não gerar conflito: o Claude Code.
