import clsx from "clsx";
import { useId, useRef, type KeyboardEvent } from "react";

type Opcao<T extends string> = { valor: T; rotulo: string };

type SegmentedControlProps<T extends string> = {
  rotulo: string;
  /** 2 ou 3 opções, como no Figma. */
  opcoes: readonly Opcao<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
};

/** Quantas opções a tecla anda; as demais teclas não mexem na escolha. */
const PASSO_DA_TECLA: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Escolha de uma opção entre 2 ou 3 (regra 157 (5)). O selecionado não é laranja: esse é só do
 * `Button` primary. Teclado: um Tab entra no grupo, e as setas andam e marcam, como em rádios.
 */
export function SegmentedControl<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: SegmentedControlProps<T>) {
  const idDoRotulo = useId();
  const grupo = useRef<HTMLDivElement>(null);

  function aoTeclar(e: KeyboardEvent, indice: number) {
    const passo = PASSO_DA_TECLA[e.key];
    if (!passo) return;
    e.preventDefault();
    const proximo = (indice + passo + opcoes.length) % opcoes.length;
    aoMudar(opcoes[proximo]!.valor);
    grupo.current?.querySelectorAll("button")[proximo]?.focus();
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <span id={idDoRotulo} className="text-label text-text-secondary">
        {rotulo}
      </span>
      <div
        ref={grupo}
        role="radiogroup"
        aria-labelledby={idDoRotulo}
        className="flex h-[52px] w-full rounded-control border-2 border-border-subtle bg-bg-surface p-4"
      >
        {opcoes.map((opcao, indice) => {
          const selecionada = opcao.valor === valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={selecionada}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => aoMudar(opcao.valor)}
              onKeyDown={(e) => aoTeclar(e, indice)}
              className={clsx(
                "min-w-0 flex-1 truncate rounded-inset px-8 text-body-strong",
                "focus-visible:outline-2 focus-visible:outline-text-primary",
                selecionada ? "bg-bg-surface-raised text-text-primary" : "text-text-secondary",
              )}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
