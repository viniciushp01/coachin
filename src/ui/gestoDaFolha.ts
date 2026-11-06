/** Quanto do caminho (a altura da folha) precisa ser arrastado para ela fechar ao soltar (regra 160). */
const FRACAO_PARA_FECHAR = 0.3;
/** Px por ms: um gesto rápido fecha mesmo sem chegar a 30% do caminho. */
const VELOCIDADE_PARA_FECHAR = 0.5;
/** Abaixo disso não é gesto, é o dedo tremendo ao tocar. */
const DESLOCAMENTO_MINIMO = 16;

export function soltarFecha({
  deslocamento,
  altura,
  velocidade,
}: {
  deslocamento: number;
  altura: number;
  velocidade: number;
}) {
  if (deslocamento < DESLOCAMENTO_MINIMO) return false;
  return deslocamento >= altura * FRACAO_PARA_FECHAR || velocidade >= VELOCIDADE_PARA_FECHAR;
}

/** O elemento rola nessa direção? `dy` positivo é o dedo descendo (o conteúdo sobe para o topo). */
function rolaNaDirecao(el: Element, dy: number) {
  if (el.scrollHeight <= el.clientHeight) return false;
  if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) return false;
  return dy > 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight;
}

/**
 * Um toque que nada dentro da folha vai rolar sobra para a página, e é aí que o navegador puxa para
 * atualizar (regra 160). Só deixa passar o que tem para onde rolar.
 */
export function toqueSobraParaAPagina(alvo: EventTarget | null, folha: Element, dy: number) {
  for (let el = alvo instanceof Element ? alvo : null; el && el !== folha; el = el.parentElement) {
    if (rolaNaDirecao(el, dy)) return false;
  }
  return true;
}
