import type { ReactNode } from "react";

/**
 * Barra fixa de botões no rodapé das telas sem menu (padding 16/20/32/20, fundo canvas).
 * Um botão: altura 100; dois (primary em cima, secondary embaixo): 164, espaço 12.
 * A tela precisa deixar a altura da barra livre embaixo.
 */
export function BarraFixa({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-screen flex-col gap-12 bg-bg-canvas px-20 pt-16 pb-[max(32px,calc(env(safe-area-inset-bottom)+8px))]">
      {children}
    </div>
  );
}
