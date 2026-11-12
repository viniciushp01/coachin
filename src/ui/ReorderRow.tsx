import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { Accessibility, type Draggable } from "@dnd-kit/dom";
import { isSortable } from "@dnd-kit/dom/sortable";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./Icon";
import { moverItem } from "./moverItem";

function descrever(source: Draggable | null) {
  if (!source || !isSortable(source)) return undefined;
  return { titulo: String(source.data.titulo), posicao: source.index + 1 };
}

type Evento = { operation: { source: Draggable | null }; canceled?: boolean };

// Textos do leitor de tela em pt-BR (o padrão da biblioteca é em inglês).
const acessibilidade = Accessibility.configure({
  screenReaderInstructions: {
    draggable:
      "Para mover, aperte espaço. Use as setas para cima e para baixo e aperte espaço de novo para soltar, ou Esc para cancelar.",
  },
  announcements: {
    dragstart({ operation: { source } }: Evento) {
      const item = descrever(source);
      return item && `${item.titulo} selecionado, na posição ${item.posicao}.`;
    },
    dragover({ operation: { source } }: Evento) {
      const item = descrever(source);
      return item && `${item.titulo} na posição ${item.posicao}.`;
    },
    dragend({ operation: { source }, canceled }: Evento) {
      const item = descrever(source);
      if (!item) return undefined;
      return canceled
        ? `Movimento cancelado. ${item.titulo} continua onde estava.`
        : `${item.titulo} solto na posição ${item.posicao}.`;
    },
  },
});

type ListaReordenavelProps<T extends { id: string }> = {
  itens: readonly T[];
  /** Recebe a lista na nova ordem. Não é chamado se o movimento for cancelado. */
  aoReordenar: (itens: T[]) => void;
  /** Uma `ReorderRow` por item, com `id` e `indice`. */
  children: (item: T, indice: number) => ReactNode;
};

/** Lista de `ReorderRow`: arrastar pela alça com o dedo, o mouse ou o teclado. */
export function ListaReordenavel<T extends { id: string }>({
  itens,
  aoReordenar,
  children,
}: ListaReordenavelProps<T>) {
  return (
    <DragDropProvider
      plugins={(padrao) => [...padrao, acessibilidade]}
      modifiers={(padrao) => [...padrao, RestrictToVerticalAxis]}
      onDragEnd={({ canceled, operation: { source } }) => {
        if (canceled || !isSortable(source)) return;
        if (source.initialIndex !== source.index) {
          aoReordenar(moverItem(itens, source.initialIndex, source.index));
        }
      }}
    >
      <ul className="flex w-full flex-col gap-8">
        {itens.map((item, indice) => children(item, indice))}
      </ul>
    </DragDropProvider>
  );
}

type ReorderRowProps = Omit<ComponentProps<"button">, "children" | "id"> & {
  id: string;
  indice: number;
  titulo: string;
  detalhe: string;
  /** Item com problema (ex.: "Sem exercícios"): detalhe em status/danger e borda border/danger. */
  comProblema?: boolean;
};

/** Linha reordenável: alça, título e detalhe (quebram de linha, sem corte: regra 165) e seta. Tocar na linha abre. */
export function ReorderRow({
  id,
  indice,
  titulo,
  detalhe,
  comProblema = false,
  type = "button",
  className,
  ...props
}: ReorderRowProps) {
  const { ref, handleRef, isDragSource } = useSortable({ id, index: indice, data: { titulo } });

  return (
    <li
      ref={ref}
      className={clsx(
        "flex min-h-[72px] items-center rounded-tile py-12",
        isDragSource ? "bg-bg-surface-raised" : "bg-bg-surface",
        comProblema && "border-2 border-border-danger",
      )}
    >
      {/* Área de toque de 40 sobre o desenho de 24; `touch-none` para o arraste não rolar a tela. */}
      <button
        ref={handleRef}
        type="button"
        aria-label={`Reordenar ${titulo}`}
        aria-roledescription="alça de arrastar"
        className="relative z-10 ml-8 flex size-40 shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-4"
      >
        <span aria-hidden="true" className="h-2 w-16 rounded-[1px] bg-text-secondary" />
        <span aria-hidden="true" className="h-2 w-16 rounded-[1px] bg-text-secondary" />
      </button>
      <button
        type={type}
        className={clsx(
          "flex min-w-0 flex-1 items-center gap-12 self-stretch rounded-r-tile pr-16 pl-4 text-left",
          className,
        )}
        {...props}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="break-words text-body-strong text-text-primary">{titulo}</span>
          <span
            className={clsx(
              "break-words text-caption",
              comProblema ? "text-status-danger" : "text-text-secondary",
            )}
          >
            {detalhe}
          </span>
        </span>
        <span className="shrink-0 text-text-secondary">
          <Icon nome="chevron_right" />
        </span>
      </button>
    </li>
  );
}
