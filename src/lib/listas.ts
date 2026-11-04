/** Lógica comum das listas de pessoas (Lista de alunos e Lista de professores, regras 59 e 147). */

type ComNome = { nome: string };

/** Ordem alfabética pt-BR pelo nome (regra 59), numa cópia da lista. */
export function emOrdemAlfabetica<T extends ComNome>(linhas: T[]): T[] {
  return [...linhas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Busca por parte do nome, sem diferenciar maiúsculas nem acentos. */
export function buscarPorNome<T extends ComNome>(linhas: T[], termo: string): T[] {
  const busca = semAcento(termo.trim());
  return busca ? linhas.filter((l) => semAcento(l.nome).includes(busca)) : linhas;
}

/** "Juliana" de "Juliana Costa": os textos com o nome usam só o primeiro (regra 144). */
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;

/** "1 aluno", "6 alunos", "0 resultados". */
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Durante a busca, o resumo da lista vira "N resultados" (regra 147); sem busca, nulo. */
export function resumoDaBusca(linhas: ComNome[], termo: string): string | null {
  return termo.trim()
    ? plural(buscarPorNome(linhas, termo).length, "resultado", "resultados")
    : null;
}
