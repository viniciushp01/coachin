/** Textos do aluno sem conexão (regra 116). Os marcados [produto] estão na regra; o resto é proposta. */
export const AVISO_GUARDADO = "Guardado. Envio quando voltar."; // [produto]
export const AVISO_ENVIADOS = "Registros enviados."; // [produto]
export const AVISO_RECUSADOS = "Alguns registros não puderam ser enviados."; // proposta
export const APOIO_DA_CARGA_SEM_CONEXAO =
  "Sem conexão: a carga fica neste aparelho e é enviada depois."; // [produto]
export const APOIO_DA_CARGA = "Editar a carga não marca o treino como feito.";

export function registrosAguardando(n: number) {
  return n === 1 ? "1 registro aguarda envio" : `${n} registros aguardam envio`;
}
