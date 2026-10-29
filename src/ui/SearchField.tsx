import clsx from "clsx";
import type { ComponentProps } from "react";
import { Icon } from "./Icon";

type SearchFieldProps = Omit<ComponentProps<"input">, "type"> & {
  /** Texto para leitor de tela (o campo não tem rótulo visível). */
  rotulo: string;
};

/** Campo de busca: ícone search + texto, 52 de altura (Figma `SearchField`). */
export function SearchField({ rotulo, className, ...props }: SearchFieldProps) {
  return (
    <div
      className={clsx(
        "flex h-[52px] w-full items-center gap-12 rounded-control border-2 border-border-subtle",
        "bg-bg-surface px-16 text-body text-text-primary focus-within:border-border-strong",
        className,
      )}
    >
      <span className="shrink-0 text-text-secondary">
        <Icon nome="search" />
      </span>
      <input
        type="search"
        aria-label={rotulo}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-disabled"
        {...props}
      />
    </div>
  );
}
