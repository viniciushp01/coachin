import clsx from "clsx";
import type { ComponentProps } from "react";

type QuickPickProps = Omit<ComponentProps<"button">, "type"> & {
  /** Atalho escolhido: fundo elevado e borda forte. O laranja é só do `Button` primary. */
  selecionado: boolean;
};

/**
 * Atalho de valor ("60 s", "Outro") para uma fileira em que só um fica escolhido (regra 159). Quem
 * usa decide o que tocar no escolhido faz (no descanso, limpa).
 */
export function QuickPick({ selecionado, className, ...props }: QuickPickProps) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      className={clsx(
        "h-[44px] min-w-0 flex-1 rounded-control border-2 px-0 text-body-strong whitespace-nowrap",
        "focus-visible:outline-2 focus-visible:outline-text-primary",
        selecionado
          ? "border-border-strong bg-bg-surface-raised text-text-primary"
          : "border-border-subtle bg-bg-surface text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
