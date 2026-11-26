import { diaEMes } from "@/features/alunos/listaDeAlunos";
import { textoDaCarga } from "./logica";

// Gráfico de evolução da carga e filtro de período (regra 175). Lógica pura: as datas são
// "aaaa-mm-dd" no fuso do aluno e os registros vêm em ordem cronológica.

export type Registro = { dia: string; kg: number };

export type Periodo = "30d" | "3m" | "6m" | "tudo";
export const PERIODO_PADRAO: Periodo = "3m";
export const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: "30d", rotulo: "30 dias" },
  { id: "3m", rotulo: "3 meses" },
  { id: "6m", rotulo: "6 meses" },
  { id: "tudo", rotulo: "Tudo" },
];

const DIA_EM_MS = 86_400_000;
const tempo = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const diasEntre = (de: string, ate: string) => Math.round((tempo(ate) - tempo(de)) / DIA_EM_MS);

/** Mesmo dia de `meses` atrás; mês mais curto cai no último dia dele (31/05 → 28/02). */
function mesesAtras(dia: string, meses: number) {
  const [ano, mes, d] = dia.split("-").map(Number) as [number, number, number];
  const alvo = ano * 12 + (mes - 1) - meses;
  const anoAlvo = Math.floor(alvo / 12);
  const mesAlvo = alvo % 12;
  const ultimo = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${anoAlvo}-${pad(mesAlvo + 1)}-${pad(Math.min(d, ultimo))}`;
}

/** Primeiro dia do período contando de `hoje` (no fuso do aluno, regra 115); nulo = Tudo. */
export function inicioDoPeriodo(periodo: Periodo, hoje: string): string | null {
  if (periodo === "tudo") return null;
  if (periodo === "30d") return iso(tempo(hoje) - 30 * DIA_EM_MS);
  return mesesAtras(hoje, periodo === "3m" ? 3 : 6);
}

export function registrosDoPeriodo(registros: Registro[], periodo: Periodo, hoje: string) {
  const inicio = inicioDoPeriodo(periodo, hoje);
  return inicio === null ? registros : registros.filter((r) => r.dia >= inicio);
}

/** O filtro só aparece com registros espalhados por mais de 30 dias (do primeiro ao último). */
export function mostrarFiltro(registros: Registro[]) {
  const primeiro = registros[0];
  const ultimo = registros.at(-1);
  return primeiro !== undefined && ultimo !== undefined && diasEntre(primeiro.dia, ultimo.dia) > 30;
}

/** "nos últimos 30 dias", "nos últimos 3 meses" (tela 11 e tela 12). */
export function textoDoPeriodoVazio(periodo: Exclude<Periodo, "tudo">) {
  return `nos últimos ${periodo === "30d" ? "30 dias" : periodo === "3m" ? "3 meses" : "6 meses"}`;
}

export type Tom = "alta" | "neutro";

/** "+5 kg", "−10 kg" (sinal de menos de verdade) ou nulo se for igual. */
function diferenca(delta: number) {
  if (delta === 0) return null;
  const valor = Number(Math.abs(delta).toFixed(2));
  return `${delta > 0 ? "+" : "−"}${textoDaCarga(valor)} kg`;
}

/**
 * Selo do cartão de carga atual: compara a última carga com o registro anterior. Aumento em
 * verde; queda e "Mesma carga" em cinza neutro, nunca vermelho. Sem selo com um registro só.
 */
export function seloDeVariacao(registros: Registro[]) {
  if (registros.length < 2) return null;
  const atual = registros.at(-1)!;
  const anterior = registros.at(-2)!;
  const delta = atual.kg - anterior.kg;
  return {
    tom: (delta > 0 ? "alta" : "neutro") as Tom,
    texto: diferenca(delta) ?? "Mesma carga",
    referencia: `desde ${diaEMes(anterior.dia)}`,
  };
}

/** Resumo no canto do gráfico: última menos primeira carga do período. */
export function resumoDoPeriodo(noPeriodo: Registro[], periodo: Periodo) {
  if (noPeriodo.length < 2) return null;
  const delta = noPeriodo.at(-1)!.kg - noPeriodo[0]!.kg;
  const quando =
    periodo === "tudo"
      ? "no total"
      : `em ${periodo === "30d" ? "30 dias" : periodo === "3m" ? "3 meses" : "6 meses"}`;
  const texto = diferenca(delta);
  return {
    tom: (delta > 0 ? "alta" : "neutro") as Tom,
    texto: texto ? `${texto} ${quando}` : `Mesma carga ${quando}`,
  };
}

// ---------------------------------------------------------------- Geometria do gráfico

export const GRAFICO = { largura: 350, altura: 200 } as const;
const AREA = { esquerda: 64, direita: 318, topo: 48, base: 136 } as const;
/** Distância mínima entre rótulos de data no eixo x, em px (Figma 2b). */
const DISTANCIA_MINIMA = 52;

export type PontoDoGrafico = {
  x: number;
  y: number;
  kg: number;
  dia: string;
  destaque: boolean;
};

export function montarGrafico(registros: Registro[]) {
  const kgs = registros.map((r) => r.kg);
  const minimo = Math.min(...kgs);
  const maximo = Math.max(...kgs);
  const t0 = tempo(registros[0]!.dia);
  const t1 = tempo(registros.at(-1)!.dia);
  const meioX = (AREA.esquerda + AREA.direita) / 2;
  const meioY = (AREA.topo + AREA.base) / 2;

  const pontos: PontoDoGrafico[] = registros.map((r, i) => ({
    x:
      t1 === t0
        ? registros.length === 1
          ? meioX
          : AREA.direita
        : AREA.esquerda + ((tempo(r.dia) - t0) / (t1 - t0)) * (AREA.direita - AREA.esquerda),
    y:
      maximo === minimo
        ? meioY
        : AREA.base - ((r.kg - minimo) / (maximo - minimo)) * (AREA.base - AREA.topo),
    kg: r.kg,
    dia: r.dia,
    destaque: i === registros.length - 1,
  }));

  // Rótulos esparsos: o primeiro e o último sempre; os do meio só se couberem entre os dois
  // vizinhos já escolhidos, a pelo menos 52 px.
  const unicos = pontos.filter((p, i) => i === 0 || p.x !== pontos[i - 1]!.x);
  const primeiro = unicos[0]!;
  const ultimo = unicos.at(-1)!;
  const escolhidos = [primeiro];
  for (const p of unicos.slice(1, -1)) {
    if (p.x - escolhidos.at(-1)!.x >= DISTANCIA_MINIMA && ultimo.x - p.x >= DISTANCIA_MINIMA) {
      escolhidos.push(p);
    }
  }
  if (ultimo !== primeiro) escolhidos.push(ultimo);

  return {
    area: AREA,
    pontos,
    minimo,
    maximo,
    raio: registros.length > 8 ? 2 : 3,
    rotulosX: escolhidos.map((p) => ({ x: p.x, dia: p.dia })),
  };
}

/** Verde só para aumento; queda e "Mesma carga" em cinza neutro, nunca vermelho (regra 175). */
export const corDoTom = (tom: Tom) =>
  tom === "alta" ? "var(--color-status-success)" : "var(--color-text-secondary)";
