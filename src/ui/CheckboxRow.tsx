import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Icon } from "./Icon";

type CheckboxRowProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  children: ReactNode;
};

/**
 * Caixa de seleção com texto ao lado (ex.: confirmação do aviso de dados, regra 49). A caixa
 * marcada é laranja, mas é controle de seleção, não botão (`design.md`). O texto é o rótulo:
 * tocar nele também marca.
 */
export function CheckboxRow({ children, className, id, ...props }: CheckboxRowProps) {
  const idGerado = useId();
  const idCaixa = id ?? idGerado;
  return (
    <label htmlFor={idCaixa} className={clsx("flex w-full cursor-pointer gap-12", className)}>
      <span className="relative size-24 shrink-0">
        <input
          id={idCaixa}
          type="checkbox"
          className="peer absolute inset-0 opacity-0"
          {...props}
        />
        <span
          aria-hidden="true"
          className={clsx(
            "flex size-24 items-center justify-center rounded-sm border-2 border-border-default text-transparent",
            "peer-checked:border-bg-brand peer-checked:bg-bg-brand peer-checked:text-text-on-brand",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text-primary",
          )}
        >
          <Icon nome="check" tamanho={24} />
        </span>
      </span>
      <span className="text-body text-text-primary">{children}</span>
    </label>
  );
}
