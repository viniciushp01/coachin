import clsx from "clsx";
import { useEffect, useRef, type ReactNode } from "react";

type SheetProps = {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  /** Texto de apoio, Notice, lista… */
  children?: ReactNode;
  /** Botões no fim da folha (confirmação: primary para manter, secondary para a ação). */
  acoes?: ReactNode;
  className?: string;
};

/**
 * Folha inferior sobre o escurecimento (scrim). Usa <dialog> modal: foco preso, Esc fecha.
 * Tocar fora da folha também fecha.
 */
export function Sheet({ aberta, aoFechar, titulo, children, acoes, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberta && !dialog.open) dialog.showModal();
    if (!aberta && dialog.open) dialog.close();
  }, [aberta]);

  return (
    // Clique no escurecimento (o próprio <dialog>) fecha; pelo teclado, o Esc já fecha.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-label={titulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-screen bg-transparent p-0 text-text-primary backdrop:bg-bg-scrim"
    >
      <div
        className={clsx(
          "flex flex-col gap-16 rounded-t-sheet bg-bg-surface px-20 pt-12 shadow-sheet",
          "pb-[max(48px,calc(env(safe-area-inset-bottom)+24px))]",
          className,
        )}
      >
        <div aria-hidden="true" className="mx-auto h-4 w-40 rounded-[4px] bg-border-default" />
        <h2 className="text-title-md">{titulo}</h2>
        {children && <div className="text-body text-text-secondary">{children}</div>}
        {acoes && <div className="flex flex-col gap-16">{acoes}</div>}
      </div>
    </dialog>
  );
}
