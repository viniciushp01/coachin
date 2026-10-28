// Gera src/ui/icons.generated.ts a partir do pacote @material-symbols/svg-400 (Rounded, peso 400).
// Os ícones são os do design.md (Parte 2 · Ícones). Ícone novo: acrescentar à lista e rodar
// `npm run icones`.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const nomes = [
  "home",
  "calendar_month",
  "trending_up",
  "history",
  "person",
  "chevron_left",
  "chevron_right",
  "check",
  "check_circle",
  "close",
  "edit",
  "fitness_center",
  "bedtime",
  "schedule",
  "keyboard_arrow_down",
  "keyboard_arrow_up",
  "mail",
  "lock",
  "logout",
  "info",
  "warning",
  "undo",
  "swap_horiz",
  "add",
  "remove",
  "search",
  "more_horiz",
  "visibility",
  "visibility_off",
  "arrow_back",
];

const require = createRequire(import.meta.url);
const pasta = join(dirname(require.resolve("@material-symbols/svg-400/package.json")), "rounded");

function caminho(arquivo) {
  const svg = readFileSync(join(pasta, arquivo), "utf8");
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  if (d.length !== 1) throw new Error(`${arquivo}: esperava 1 path, achei ${d.length}`);
  return d[0];
}

const linhas = nomes.map(
  (n) => `  ${n}: { outline: "${caminho(`${n}.svg`)}", filled: "${caminho(`${n}-fill.svg`)}" },`,
);

writeFileSync(
  "src/ui/icons.generated.ts",
  `// Gerado por scripts/gerar-icones.mjs. Não editar à mão.
// Material Symbols Rounded (Apache 2.0), viewBox "0 -960 960 960".
export const icones = {
${linhas.join("\n")}
} as const;

export type NomeIcone = keyof typeof icones;
`,
);
console.log(`${nomes.length} ícones gerados.`);
