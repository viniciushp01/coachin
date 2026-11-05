import { plural } from "@/lib/listas";
import { textoDaMedida, type Medida } from "@/features/treino/medida";

export type DiaDaFicha = { id: string; letra: string; posicao: number; removida: boolean };
export type Marcacao = {
  diaId: string;
  /** Data da marcação, "aaaa-mm-dd" no fuso do aluno (regra 115). */
  feitoEm: string;
  marcadaEm: string;
};

/** A última feita: a do dia mais recente; no mesmo dia, a última marcada (regra 16). */
export function ultimaMarcacao(marcacoes: Marcacao[]) {
  return (
    [...marcacoes].sort(
      (a, b) => b.feitoEm.localeCompare(a.feitoEm) || b.marcadaEm.localeCompare(a.marcadaEm),
    )[0] ?? null
  );
}

/**
 * A "Ficha de hoje": a próxima que existe, na ordem, depois da última feita (regras 14 a 17 e 111).
 * Última feita = a do dia mais recente; no mesmo dia, a última marcada. Se ela foi removida, vale a
 * posição dela; depois da última da lista, volta à primeira.
 */
export function fichaDeHoje<T extends DiaDaFicha>(dias: T[], marcacoes: Marcacao[]): T | null {
  const vivas = dias.filter((d) => !d.removida).sort((a, b) => a.posicao - b.posicao);
  if (vivas.length === 0) return null;
  const ultima = ultimaMarcacao(marcacoes);
  const posicao = dias.find((d) => d.id === ultima?.diaId)?.posicao;
  if (posicao === undefined) return vivas[0] ?? null;
  return vivas.find((d) => d.posicao > posicao) ?? vivas[0] ?? null;
}

const DIA_EM_MS = 86_400_000;
const somarDias = (data: string, dias: number) =>
  new Date(Date.parse(`${data}T00:00:00Z`) + dias * DIA_EM_MS).toISOString().slice(0, 10);

/** Os sete dias (segunda a domingo) da semana de `data`, "aaaa-mm-dd". */
export function diasDaSemana(data: string) {
  const diaDaSemana = new Date(`${data}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const desdeSegunda = (diaDaSemana + 6) % 7;
  const segunda = somarDias(data, -desdeSegunda);
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const diaDoMes = (data: string) => Number(data.slice(8, 10));
const mesCurto = (data: string) => MESES[Number(data.slice(5, 7)) - 1];

/** "26 out – 1 nov" ou, no mesmo mês, "23 – 29 nov". */
export function rotuloDaSemana(dias: string[]) {
  const [primeiro, ultimo] = [dias[0]!, dias[dias.length - 1]!];
  if (primeiro.slice(5, 7) === ultimo.slice(5, 7))
    return `${diaDoMes(primeiro)} – ${diaDoMes(ultimo)} ${mesCurto(ultimo)}`;
  return `${diaDoMes(primeiro)} ${mesCurto(primeiro)} – ${diaDoMes(ultimo)} ${mesCurto(ultimo)}`;
}

/** Marcar vale do dia de início até hoje; dias futuros ficam neutros (regras 23 e 24). */
export function podeMarcar(inicio: string, dia: string, hoje: string) {
  return dia >= inicio && dia <= hoje;
}

/** "3 séries · 12 repetições" ou "3 séries · 30 s", sem "3 × 30 s" (regra 124). */
export function textoDaSerie(series: number, reps: string, medida: Medida) {
  const numeroOuFaixa = /^\d+(\s*-\s*\d+)?$/.test(reps);
  const medido =
    medida === "reps" && numeroOuFaixa
      ? `${reps} ${reps === "1" ? "repetição" : "repetições"}`
      : textoDaMedida(reps, medida);
  return `${plural(series, "série", "séries")} · ${medido}`;
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES_COMPLETOS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "Quinta, 29 de outubro". */
export function dataPorExtenso(data: string) {
  const dia = DIAS[new Date(`${data}T00:00:00Z`).getUTCDay()]!;
  const capitalizado = dia[0]!.toUpperCase() + dia.slice(1);
  return `${capitalizado}, ${diaDoMes(data)} de ${MESES_COMPLETOS[Number(data.slice(5, 7)) - 1]}`;
}

/** "62,5" ou "62.5" → 62.5; vazio, zero, negativo ou acima de 1000 → null (como `set_load`). */
export function lerCarga(texto: string) {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const kg = Number(limpo);
  return kg > 0 && kg <= 1000 ? kg : null;
}

/** 62.5 → "62,5"; 60 → "60". */
export function textoDaCarga(kg: number) {
  return String(kg).replace(".", ",");
}

/** "dd/mm" de um instante, no fuso do aparelho. */
export const diaDaEdicao = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
