/** Tela em que recarregar atrapalharia: o aluno na ficha, treinando. */
function emTreino(caminho: string) {
  return caminho.startsWith("/aluno/ficha/");
}

type Agenda = {
  /** Caminho da tela aberta agora. */
  caminhoAtual: () => string;
  /** Avisa a cada troca de tela; devolve a função que para de ouvir. */
  aoMudarDeTela: (ouvir: () => void) => () => void;
  /** Troca para a versão nova e recarrega o app. */
  aplicar: () => void;
};

/**
 * Versão nova do app encontrada (regra 177): aplica sozinha, sem aviso. Fora do treino, na
 * hora. Com o aluno na ficha, espera ele sair dela, para nunca recarregar no meio do treino
 * (ADR 0001).
 */
export function agendarAtualizacao({ caminhoAtual, aoMudarDeTela, aplicar }: Agenda) {
  if (!emTreino(caminhoAtual())) {
    aplicar();
    return;
  }
  const parar = aoMudarDeTela(() => {
    if (emTreino(caminhoAtual())) return;
    parar();
    aplicar();
  });
}
