#!/usr/bin/env node
// Gera, a partir do repositório, os dois arquivos que os chats do Claude leem no começo de cada conversa:
//   ESTADO.md         estado vivo (PRs, issues, plano, números, onde achar cada coisa)
//   INDICE-REGRAS.md  uma linha por regra de negócio, para achar a regra certa sem ler o contexto-produto.md inteiro
// Uso (na raiz do repo):  node scripts/gerar-estado.mjs <pasta-de-saida> [--offline]
// Sem dependências. Em produção roda no workflow .github/workflows/estado.yml, que publica na branch `claude-estado`.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const REPO = process.env.GITHUB_REPOSITORY ?? "viniciushp01/coachin";
const OUT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "estado-out";
const OFFLINE = process.argv.includes("--offline");
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const avisos = [];

const sh = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 50e6,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const ler = (caminho) => readFileSync(caminho, "utf8");

function api(caminho) {
  if (OFFLINE) return null;
  try {
    return JSON.parse(sh("gh", ["api", caminho]));
  } catch (e) {
    avisos.push(
      `Não consegui ler \`${caminho.split("?")[0]}\` (${String(e.message).split("\n")[0].slice(0, 80)}).`,
    );
    return null;
  }
}

function secao(texto, inicio, fim) {
  const i = texto.search(inicio);
  if (i < 0) return "";
  const resto = texto.slice(i);
  const j = resto.slice(1).search(fim);
  return (j < 0 ? resto : resto.slice(0, j + 1)).trim();
}

const limitar = (texto, max) =>
  texto.length > max
    ? `${texto.slice(0, max).trimEnd()}\n\n_(cortado; leia o arquivo completo no link da seção "Documentos")_`
    : texto;
const brasilia = (d = new Date()) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);

// ---------- regras ----------
const ctx = ler("docs/contexto/contexto-produto.md");
const regras = new Map();
for (const linha of ctx.split("\n")) {
  const m = linha.match(/^(\d{1,3})\. (.+)/);
  if (m && !regras.has(Number(m[1]))) regras.set(Number(m[1]), m[2]);
}
const ultimaRegra = Math.max(...regras.keys());

function tituloDaRegra(texto) {
  const negrito = texto.match(/^\*\*(.+?)\*\*/);
  const base = negrito ? negrito[1] : texto;
  const limpo = base.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return limpo.length > 100 ? `${limpo.slice(0, 97)}...` : limpo;
}

const indice = [
  "# Coach In · Índice de regras (gerado)",
  "",
  `Regras 1 a ${ultimaRegra}. Gerado em ${brasilia()} (Brasília). Não edite: vem de \`docs/contexto/contexto-produto.md\`.`,
  "",
  "Use para achar o número certo; depois leia **só** essas regras no arquivo completo (busque por `NNN. ` no início da linha).",
  "",
  ...[...regras.entries()].sort((a, b) => a[0] - b[0]).map(([n, t]) => `${n}. ${tituloDaRegra(t)}`),
  "",
].join("\n");

// ---------- git e números ----------
const sha = sh("git", ["rev-parse", "--short", "HEAD"]);
const ultimoCommit = sh("git", ["log", "-1", "--format=%cs · %s"]);
const migrations = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

// ---------- GitHub ----------
const abertos = api(`repos/${REPO}/pulls?state=open&per_page=50`);
const fechados = api(`repos/${REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=40`);
const issues = api(`repos/${REPO}/issues?state=open&per_page=100`);
const runs = api(`repos/${REPO}/actions/workflows/ci.yml/runs?branch=main&per_page=1`);

const linhaPr = (p) =>
  `- #${p.number} ${p.title} · ${p.user?.login ?? "?"} · \`${p.head.ref}\`${p.draft ? " · rascunho" : ""} · atualizado em ${p.updated_at.slice(0, 10)}`;
const secPrAbertos = abertos
  ? abertos.length
    ? abertos.map(linhaPr).join("\n")
    : "Nenhum PR aberto."
  : "_indisponível nesta geração_";
const merged = (fechados ?? []).filter((p) => p.merged_at).slice(0, 10);
const secPrMerged = fechados
  ? merged.length
    ? merged
        .map((p) => `- #${p.number} ${p.title} · mergeado em ${p.merged_at.slice(0, 10)}`)
        .join("\n")
    : "Nenhum."
  : "_indisponível nesta geração_";

let secIssues = "_indisponível nesta geração_";
if (issues) {
  const soIssues = issues.filter((i) => !i.pull_request);
  const grupos = new Map();
  for (const i of soIssues) {
    const nomes = i.labels.map((l) => l.name);
    const chave =
      ["needs-info", "ready-for-agent", "ready-for-human", "needs-triage"].find((n) =>
        nomes.includes(n),
      ) ?? "sem rótulo de triagem";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(i);
  }
  secIssues = soIssues.length
    ? [...grupos.entries()]
        .map(([nome, lista]) => {
          const mostrados = lista.slice(0, 15).map((i) => `- #${i.number} ${i.title}`);
          if (lista.length > 15) mostrados.push(`- … e mais ${lista.length - 15}`);
          return `**${nome}** (${lista.length})\n${mostrados.join("\n")}`;
        })
        .join("\n\n")
    : "Nenhuma issue aberta.";
}

const run = runs?.workflow_runs?.[0];
const ci = run
  ? `${run.conclusion ?? run.status} (${run.name}, commit ${run.head_sha.slice(0, 7)}) · ${run.html_url}`
  : "_indisponível nesta geração_";

// ---------- trechos vivos dos docs ----------
const workflow = ler("docs/WORKFLOW.md");
const planoBruto = secao(workflow, /^### Plano até o piloto/m, /^### Fase 0/m);

// Etapa atual = primeira linha da tabela do plano cuja 1ª coluna não está riscada (~~).
// Sem tabela, devolve null e o plano sai como antes.
function etapaAtual(texto) {
  const linhas = texto.split(/\r?\n/);
  const sep = linhas.findIndex((l) => /^\|\s*:?-{3,}/.test(l));
  if (sep < 1) return null;
  const etapas = [];
  for (const l of linhas.slice(sep + 1)) {
    if (!l.trim().startsWith("|")) break;
    etapas.push(l.split("|")[1]?.trim() ?? "");
  }
  if (!etapas.length) return null;
  const atual = etapas.find((c) => !c.includes("~~"));
  return atual
    ? `**Etapa atual: ${atual.replace(/\s+/g, " ")}**`
    : "**Etapa atual: todas as etapas do plano estão concluídas**";
}

function planoComEtapa(texto) {
  const linha = etapaAtual(texto);
  if (!linha) return texto;
  const [titulo, ...resto] = texto.split(/\r?\n/);
  return [titulo, "", linha, ...resto].join("\n");
}

const plano = limitar(planoComEtapa(planoBruto).replace(/^### /, "#### "), 3500);
const pontos = limitar(
  secao(ctx, /^## 8\. Pontos em aberto/m, /^## 9\./m)
    .replace(/^## 8\. Pontos em aberto/, "")
    .trim(),
  3500,
);
const proxRegraWorkflow = workflow.match(/próxima é a \*\*(\d+)\*\*/)?.[1];

// ---------- documentos ----------
const docs = [
  "CLAUDE.md",
  "docs/WORKFLOW.md",
  "docs/schema-coach-in.md",
  "docs/adr/0001-stack.md",
  ...readdirSync("docs/contexto")
    .filter((f) => f.endsWith(".md"))
    .map((f) => `docs/contexto/${f}`),
];
const tabelaDocs = docs
  .map((d) => {
    const kb = (Buffer.byteLength(ler(d)) / 1024).toFixed(0);
    const data = sh("git", ["log", "-1", "--format=%cs", "--", d]);
    return `| \`${d}\` | ${kb} KB | ${data} | ${RAW}/${d} |`;
  })
  .join("\n");

const aviso = avisos.length ? `\n> ⚠️ ${avisos.join("\n> ⚠️ ")}\n` : "";

const estado = `# Coach In · Estado do projeto (gerado)

Gerado em ${brasilia()} (Brasília) a partir da \`main\` @ \`${sha}\` (${ultimoCommit}). **Não edite**: é regenerado a cada push, PR, issue e fim de CI. Se a data acima for antiga demais, desconfie e diga ao Vinicius.${aviso}

## Onde está cada coisa
- Repositório (fonte da verdade): https://github.com/${REPO} · produção: https://coachin.vercel.app
- Figma: arquivo **Coach In** \`IDP8M2IKanbn60dyqmzjh1\` (mapa de páginas em \`docs/contexto/figma-paginas.md\`) · FigJam do produto \`JNuuAUgUlhLvia1HZ5X3xO\`
- Supabase: \`coach-in-app\` (ref \`kfjjiajxgbsqpuskxbzb\`, sa-east-1) · desenho e funções em \`docs/schema-coach-in.md\`
- Regras de negócio: \`docs/contexto/contexto-produto.md\` (grande: nunca leia inteiro; use o índice \`INDICE-REGRAS.md\` desta mesma branch)

## Números
- Regras: 1 a ${ultimaRegra}. **Próxima regra: ${ultimaRegra + 1}**${proxRegraWorkflow && Number(proxRegraWorkflow) !== ultimaRegra + 1 ? ` (o WORKFLOW diz ${proxRegraWorkflow}: conferir qual está certo)` : ""}
- Migrations no repositório: ${migrations.length} · última: \`${migrations.at(-1)}\`
- CI na main: ${ci}

## Plano e etapa atual (trecho vivo do WORKFLOW)
${plano || "_seção não encontrada_"}

## PRs abertos
${secPrAbertos}

## PRs mergeados recentemente
${secPrMerged}

## Issues abertas
${secIssues}

## Pontos em aberto do produto (trecho vivo do contexto-produto)
${pontos || "_seção não encontrada_"}

## Documentos
| Arquivo | Tamanho | Última alteração | Texto cru |
|---|---|---|---|
${tabelaDocs}

## Como ler sem gastar tokens
1. Achar a regra: leia \`INDICE-REGRAS.md\` (uma linha por regra).
2. Ler a regra: com clone ou shell, \`grep -n "^NNN\\. " docs/contexto/contexto-produto.md\`; sem shell, busque o texto cru e peça só as regras N a M.
3. Componentes e tokens: \`docs/contexto/design.md\`, só a parte que o ticket cita.
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/ESTADO.md`, estado);
writeFileSync(`${OUT}/INDICE-REGRAS.md`, indice);
// Evita que a Vercel tente publicar esta branch (ela só tem texto).
writeFileSync(
  `${OUT}/vercel.json`,
  JSON.stringify({ git: { deploymentEnabled: false } }, null, 2) + "\n",
);
console.log(
  `ok: ${OUT}/ESTADO.md (${Buffer.byteLength(estado)} bytes), ${OUT}/INDICE-REGRAS.md (${Buffer.byteLength(indice)} bytes)${avisos.length ? `, ${avisos.length} aviso(s)` : ""}`,
);
