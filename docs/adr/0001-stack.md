---
status: accepted
date: 2026-10-28
---

# Stack do app: SPA com Vite + React, hospedada na Vercel

O Coach In é um app web instalável (PWA, regra 116), todo autenticado, sem necessidade de SEO, com fila local em IndexedDB e toda escrita via funções (RPC) do Supabase. Não há servidor próprio. Por isso o app é uma **SPA em Vite + React + TypeScript**, hospedada como site estático na **Vercel**. O Next.js foi descartado: traz renderização no servidor e rotas de API que o produto não usa, e complica o service worker e o modo offline.

## Decisões

| Tema | Escolha |
|---|---|
| Framework | Vite + React + TypeScript (SPA) |
| Hospedagem | Vercel: projeto `coachin` ligado a `viniciushp01/coachin`, preview a cada PR, produção na `main`, rewrite de todas as rotas para `index.html` |
| Repositório | App na raiz, sem monorepo; tipos do banco importados de `supabase/database.types.ts` |
| Pacotes e runtime | npm; Node 24 (`.nvmrc` e `engines`) |
| Estilos | Tailwind v4 com os tokens do `design.md` como variáveis CSS no `@theme`, **substituindo** a escala padrão (só existem cores, espaços e raios do design system) |
| Lint e formato | ESLint (com React Hooks e jsx-a11y) + Prettier |
| Rotas | TanStack Router, rotas em arquivo (`src/routes`), guard por papel no `beforeLoad`; o papel sempre vem do servidor |
| Dados | TanStack Query para leituras e chamadas RPC |
| PWA | vite-plugin-pwa (`generateSW`), atualização avisada ao usuário, sem recarregar no meio do treino |
| Fila local | idb (fila de envio com id único por item + cópia do treino ativo); envio ao abrir o app ou ao voltar a ficar visível |
| Formulários | react-hook-form + zod, mensagens em pt-BR no schema |
| Testes | Vitest + Testing Library + fake-indexeddb; banco no PGlite; Playwright só na Fase 2 |
| Exemplos de componentes | Rota interna `/dev/componentes`, só local e preview, nunca em produção |
| CI | GitHub Actions (lint, tipos, Vitest, testes do banco) obrigatório para entrar na `main`, que fica protegida |
| Fontes e ícones | Jost e Inter via `@fontsource` e os ícones Material Symbols Rounded como SVG, tudo empacotado (funciona offline, sem Google em tempo de execução) |
| Pastas | Por fatia: `src/features/<fatia>`, `src/ui` (componentes base), `src/lib` (Supabase, fila, erros); `src/routes` só como entrada |
| Erros do banco | `src/lib/erros.ts` traduz cada código curto para pt-BR; um teste lê as migrations e falha se algum código ficar sem tradução |

## Consequências

- **Um único projeto Supabase** (`kfjjiajxgbsqpuskxbzb`) serve local, preview e produção enquanto não houver usuário real. Antes do lançamento (Fase 2), criar um projeto de produção separado e trocar as variáveis da Vercel. Quem achar estranho o preview gravar no mesmo banco: foi deliberado, para não pagar branching antes da hora.
- Sem envio da fila em segundo plano com o app fechado (não é confiável no iOS); fica para depois do MVP, junto com o offline completo.
- Mudar de framework depois significa reescrever rotas e a integração do PWA; as camadas `src/lib` e `src/ui` foram separadas para sobreviver a essa troca.
