import clsx from "clsx";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

type TelaProps = {
  children: ReactNode;
  /** Mostra o símbolo da marca no topo (padrão). */
  logo?: boolean;
  /** Espaço livre embaixo para a barra fixa: 1 botão (100) ou 2 (164). */
  barra?: "um" | "dois";
  className?: string;
};

/**
 * Estrutura de tela: 390 de largura, margem 20, topo com o símbolo (y 56, abaixo da barra de
 * status) e espaço para a barra fixa do rodapé, quando houver.
 */
export function Tela({ children, logo = true, barra, className }: TelaProps) {
  return (
    <main
      className={clsx(
        "mx-auto flex min-h-dvh w-full max-w-screen flex-col gap-16 px-screen-margin",
        "pt-[max(56px,calc(env(safe-area-inset-top)+16px))]",
        barra === "um" && "pb-[calc(100px+env(safe-area-inset-bottom))]",
        barra === "dois" && "pb-[calc(164px+env(safe-area-inset-bottom))]",
        !barra && "pb-32",
        className,
      )}
    >
      {logo && <Logo />}
      {children}
    </main>
  );
}
