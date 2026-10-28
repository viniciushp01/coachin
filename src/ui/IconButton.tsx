import clsx from "clsx";
import type { ComponentProps } from "react";
import { Icon, type NomeIcone } from "./Icon";

type IconButtonProps = Omit<ComponentProps<"button">, "children"> & {
  icone: NomeIcone;
  /** Texto para leitor de tela (o botão só tem ícone). */
  rotulo: string;
  /**
   * lg + card = 44, círculo, sobre o fundo; lg + raised = 40 (voltar, setas);
   * sm = 32, ícone 20 (− e + do Stepper).
   */
  tamanho?: "lg" | "sm";
  superficie?: "card" | "raised";
};

export function IconButton({
  icone,
  rotulo,
  tamanho = "lg",
  superficie = "raised",
  type = "button",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center disabled:opacity-35",
        tamanho === "sm"
          ? "size-32 rounded-control bg-bg-surface-raised text-text-secondary"
          : superficie === "card"
            ? "size-[44px] rounded-pill bg-bg-surface text-text-primary"
            : "size-40 rounded-tile bg-bg-surface-raised text-text-primary",
        className,
      )}
      {...props}
    >
      <Icon nome={icone} tamanho={tamanho === "sm" ? 20 : 24} />
    </button>
  );
}

/** Botão de voltar das telas sem menu (círculo 40, arrow_back). */
export function BackButton(props: Omit<IconButtonProps, "icone" | "rotulo">) {
  return <IconButton icone="arrow_back" rotulo="Voltar" {...props} />;
}
