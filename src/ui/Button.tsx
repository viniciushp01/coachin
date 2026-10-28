import clsx from "clsx";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  /** primary = o único laranja da tela; secondary = contorno. Desabilitado vira o visual "disabled". */
  variante?: "primary" | "secondary";
};

export function Button({
  variante = "primary",
  type = "button",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        "flex h-[52px] w-full items-center justify-center rounded-control px-16 text-body-strong",
        disabled
          ? "bg-bg-surface-raised text-text-disabled"
          : variante === "primary"
            ? "bg-bg-brand text-text-on-brand active:opacity-80"
            : "border border-border-default text-text-primary active:bg-bg-surface",
        className,
      )}
      {...props}
    />
  );
}

type ButtonCompactProps = ComponentProps<"button"> & {
  /** md = "Editar" (48); sm = "Marcar" (32). */
  tamanho?: "md" | "sm";
};

export function ButtonCompact({
  tamanho = "md",
  type = "button",
  className,
  ...props
}: ButtonCompactProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center border text-text-primary active:bg-bg-surface-raised",
        tamanho === "md"
          ? "h-48 rounded-control border-border-default px-20 text-body-strong"
          : "h-32 rounded-inset border-border-strong px-16 text-label-strong",
        className,
      )}
      {...props}
    />
  );
}

type TextButtonProps = ComponentProps<"button"> & {
  /** link = azul sublinhado; muted = cinza. */
  tom?: "link" | "muted";
};

export function TextButton({
  tom = "link",
  type = "button",
  className,
  ...props
}: TextButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex min-h-48 items-center justify-center gap-8 py-12",
        tom === "link" ? "text-link" : "text-body-strong text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
