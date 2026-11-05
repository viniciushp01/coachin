import clsx from "clsx";
import type { ComponentProps } from "react";

/** left = número à esquerda; suffix = com unidade à direita; center = centralizado (faixa). */
export type FormatoDoNumero = "left" | "suffix" | "center";

type NumberFieldProps = Omit<ComponentProps<"input">, "type" | "inputMode"> & {
  formato?: FormatoDoNumero;
  /** Só no formato suffix (o "s" de segundos). */
  sufixo?: string;
  /** Com erro, a borda fica border-danger. O texto do erro fica com quem usa o campo. */
  invalido?: boolean;
};

/**
 * Campo só de número (regra 159): abre o teclado numérico e ocupa a largura que receber. Sem rótulo
 * próprio: use um `<label htmlFor>` ou `aria-label`. Foco = borda border-strong, como os demais.
 */
export function NumberField({
  formato = "left",
  sufixo = "s",
  invalido,
  className,
  ...props
}: NumberFieldProps) {
  return (
    <div
      className={clsx(
        "flex h-[52px] w-full min-w-0 items-center gap-8 rounded-control border-2 bg-bg-surface text-body",
        "text-text-primary focus-within:border-border-strong",
        formato === "center" ? "px-8" : "justify-between px-16",
        invalido ? "border-border-danger" : "border-border-subtle",
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-invalid={invalido ? true : undefined}
        className={clsx(
          "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-disabled",
          formato === "center" && "text-center",
        )}
        {...props}
      />
      {formato === "suffix" && (
        <span aria-hidden="true" className="shrink-0 text-text-secondary">
          {sufixo}
        </span>
      )}
    </div>
  );
}
