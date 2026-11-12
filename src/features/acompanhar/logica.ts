import { hojeDoAluno, semanaDoTreino } from "@/lib/diaDoAluno";
import { plural } from "@/lib/listas";
import { telefoneDoServidor } from "@/lib/perfil";
import { textoDaCarga } from "@/features/aluno/logica";
import { diaEMes } from "@/features/alunos/listaDeAlunos";
import { mesDe, nomeDoMes, somarMeses, type Mes } from "@/ui/datas";

// Lógica pura do professor acompanhando o aluno (regras 41, 43, 44, 61 a 63 e 68 a 72). Todas as
// datas são "aaaa-mm-dd" no fuso do aluno; quem lê do banco converte antes (`diaNoFuso`).

/** O dia (no fuso do aluno) de um instante guardado em UTC, como `edited_at` e `updated_at`. */
export function diaNoFuso(instante: string, fuso: string | null | undefined) {
  return hojeDoAluno(fuso, new Date(instante));
}

/** "dd/mm/aaaa" de uma data "aaaa-mm-dd". */
export const diaMesAno = (data: string) => `${diaEMes(data)}/${data.slice(0, 4)}`;

// ---------------------------------------------------------------- Calendário

export type FichaMarcada = {
  id: string;
  treinoId: string;
  letra: string;
  nome: string;
  removida: boolean;
  exercicios: number;
};
export type MarcacaoDoDia = { diaId: string; feitoEm: string };

/** As letras das fichas feitas num dia, na ordem em que aparecem ("AB"). */
export function marcasDoDia(marcacoes: MarcacaoDoDia[], fichas: FichaMarcada[], dia: string) {
  return marcacoes
    .filter((m) => m.feitoEm === dia)
    .map((m) => fichas.find((f) => f.id === m.diaId)?.letra ?? "")
    .sort()
    .join("");
}

/** Estado do dia no calendário: futuro (depois de hoje) é neutro e sem toque (regras 23 e 61). */
export function estadoDoDia(dia: string, hoje: string) {
  return dia === hoje ? "hoje" : dia > hoje ? "futuro" : "padrao";
}

const nomeDoMesSemAno = (mes: Mes) => nomeDoMes(mes).split(" de ")[0]!;

/** "13 treinos em outubro", "1 treino em outubro" ou "Nenhum treino em outubro". */
export function textoDoMes(marcacoes: MarcacaoDoDia[], mes: Mes) {
  const noMes = marcacoes.filter((m) => {
    const feito = mesDe(m.feitoEm);
    return feito.ano === mes.ano && feito.mes === mes.mes;
  }).length;
  const nome = nomeDoMesSemAno(mes);
  return noMes === 0
    ? `Nenhum treino em ${nome}`
    : `${plural(noMes, "treino", "treinos")} em ${nome}`;
}

const emMeses = ({ ano, mes }: Mes) => ano * 12 + mes;

/**
 * Os meses que dá para abrir: do início do primeiro treino (ou da primeira marcação) até o mês do
 * fim do último treino ou de hoje, o que vier depois.
 */
export function limitesDoCalendario(
  treinos: { inicio: string; fim: string }[],
  marcacoes: MarcacaoDoDia[],
  hoje: string,
) {
  const inicios = [...treinos.map((t) => t.inicio), ...marcacoes.map((m) => m.feitoEm), hoje];
  const fins = [...treinos.map((t) => t.fim), hoje];
  return { primeiro: mesDe(inicios.sort()[0]!), ultimo: mesDe(fins.sort().at(-1)!) };
}

export const podeVoltarMes = (mes: Mes, primeiro: Mes) => emMeses(mes) > emMeses(primeiro);
export const podeAvancarMes = (mes: Mes, ultimo: Mes) => emMeses(mes) < emMeses(ultimo);
export { somarMeses };

/** "Treino concluído em dd/mm" só quando o treino ativo já passou da data de fim (regras 43 e 72). */
export function avisoDeTreinoConcluido(fim: string | null, hoje: string) {
  return fim && hoje > fim ? `Treino concluído em ${diaEMes(fim)}` : null;
}

/** "Costas e bíceps · 6 exercícios". */
export const detalheDaFicha = (nome: string, exercicios: number) =>
  `${nome} · ${plural(exercicios, "exercício", "exercícios")}`;

/** "Hipertrofia · Fase 2 · Semana 4 de 8", com a semana do dia em que a ficha foi feita. */
export function situacaoDoTreino(nome: string, inicio: string, fim: string, dia: string) {
  const semana = semanaDoTreino(inicio, fim, dia);
  return `${nome} · Semana ${semana.atual} de ${semana.total}`;
}

// ---------------------------------------------------------------- Progressão

/** "Última carga 55 kg · 22/10". */
export const textoDaUltimaCarga = (kg: number, dia: string) =>
  `Última carga ${textoDaCarga(kg)} kg · ${diaEMes(dia)}`;

// ---------------------------------------------------------------- Histórico

/** "10/08 – 04/10 · 8 semanas". */
export const periodoDoTreino = (inicio: string, fim: string, semanas: number) =>
  `${diaEMes(inicio)} – ${diaEMes(fim)} · ${plural(semanas, "semana", "semanas")}`;

/** "Fichas A, B e C", "Fichas A e B" ou "Ficha A", das que não foram removidas. */
export function fichasDoTreino(letras: string[]) {
  const ordenadas = [...letras].sort();
  if (ordenadas.length === 0) return "Sem fichas";
  if (ordenadas.length === 1) return `Ficha ${ordenadas[0]}`;
  const ultima = ordenadas[ordenadas.length - 1];
  return `Fichas ${ordenadas.slice(0, -1).join(", ")} e ${ultima}`;
}

/** "2 treinos anteriores", "1 treino anterior" ou "Nenhum treino anterior". */
export function textoDosAnteriores(n: number) {
  return n === 0
    ? "Nenhum treino anterior"
    : `${n} ${n === 1 ? "treino anterior" : "treinos anteriores"}`;
}

// ---------------------------------------------------------------- Perfil

/** Idade completa em anos em `hoje`. */
export function idadeEm(nascimento: string, hoje: string) {
  const anos = Number(hoje.slice(0, 4)) - Number(nascimento.slice(0, 4));
  const fezAniversario = hoje.slice(5) >= nascimento.slice(5);
  return fezAniversario ? anos : anos - 1;
}

/** "14/03/1994 · 32 anos". */
export const nascimentoComIdade = (nascimento: string, hoje: string) => {
  const idade = idadeEm(nascimento, hoje);
  return `${diaMesAno(nascimento)} · ${idade} ${idade === 1 ? "ano" : "anos"}`;
};

/** "+5531987654321" → "+55 (31) 98765-4321". */
export function telefoneParaExibir(telefone: string) {
  const { codigo, numero } = telefoneDoServidor(telefone);
  return `${codigo} ${numero}`;
}

/** Link do WhatsApp (regra 108): só dígitos, com o código do país. */
export const linkDoWhatsApp = (telefone: string) => `https://wa.me/${telefone.replace(/\D/g, "")}`;

/** 1.78 → "1,78 m"; 82 → "82 kg". */
export const alturaEmTexto = (m: number) => `${m.toFixed(2).replace(".", ",")} m`;
export const pesoEmTexto = (kg: number) => `${textoDaCarga(kg)} kg`;
