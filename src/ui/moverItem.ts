/** Nova lista com o item de `de` na posição `para`. */
export function moverItem<T>(itens: readonly T[], de: number, para: number): T[] {
  const novos = [...itens];
  novos.splice(para, 0, ...novos.splice(de, 1));
  return novos;
}
