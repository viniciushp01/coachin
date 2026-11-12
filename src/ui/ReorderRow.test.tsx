// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListaReordenavel, ReorderRow } from "./ReorderRow";
import { moverItem } from "./moverItem";

// A biblioteca de arrastar observa a tela e as animações; jsdom não tem nada disso.
document.getAnimations = () => [];
Element.prototype.getAnimations = () => [];
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
}));
class ObservadorInerte {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", ObservadorInerte);
vi.stubGlobal("ResizeObserver", ObservadorInerte);

afterEach(cleanup);

const fichas = [
  { id: "a", titulo: "Ficha A · Peito e tríceps", detalhe: "6 exercícios" },
  { id: "b", titulo: "Ficha B · Costas e bíceps", detalhe: "Sem exercícios" },
];

function Lista({ aoAbrir = () => {} }: { aoAbrir?: (id: string) => void }) {
  return (
    <ListaReordenavel itens={fichas} aoReordenar={() => {}}>
      {(ficha, indice) => (
        <ReorderRow
          key={ficha.id}
          id={ficha.id}
          indice={indice}
          titulo={ficha.titulo}
          detalhe={ficha.detalhe}
          comProblema={ficha.id === "b"}
          onClick={() => aoAbrir(ficha.id)}
        />
      )}
    </ListaReordenavel>
  );
}

describe("ReorderRow", () => {
  it("mostra título e detalhe, na ordem recebida", () => {
    render(<Lista />);
    const linhas = screen.getAllByRole("listitem");
    expect(linhas[0]).toHaveTextContent("Ficha A · Peito e tríceps");
    expect(linhas[0]).toHaveTextContent("6 exercícios");
    expect(linhas[1]).toHaveTextContent("Ficha B · Costas e bíceps");
  });

  it("o leitor de tela anuncia a alça com o nome do item", () => {
    render(<Lista />);
    const alca = screen.getByRole("button", { name: "Reordenar Ficha A · Peito e tríceps" });
    expect(alca).toHaveAttribute("aria-roledescription", "alça de arrastar");
  });

  it("tocar na linha abre o item, e tocar na alça não abre", async () => {
    const aoAbrir = vi.fn();
    render(<Lista aoAbrir={aoAbrir} />);
    await userEvent.click(screen.getByRole("button", { name: /^Ficha B/ }));
    expect(aoAbrir).toHaveBeenCalledWith("b");
    aoAbrir.mockClear();
    await userEvent.click(screen.getByRole("button", { name: /^Reordenar Ficha B/ }));
    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it("com problema, o detalhe fica em status/danger e a borda em border/danger", () => {
    render(<Lista />);
    expect(screen.getByText("Sem exercícios")).toHaveClass("text-status-danger");
    expect(screen.getByText("6 exercícios")).toHaveClass("text-text-secondary");
    const [semProblema, comProblema] = screen.getAllByRole("listitem");
    expect(comProblema).toHaveClass("border-2", "border-border-danger");
    expect(semProblema).not.toHaveClass("border-2");
  });
});

describe("ReorderRow com nome longo (regra 165)", () => {
  const NOME = "Supino inclinado com halteres e pausa no peito (pegada neutra)";

  it("mostra o nome e o detalhe inteiros, sem classe de corte, e a linha cresce", () => {
    render(
      <ListaReordenavel itens={[{ id: "x" }]} aoReordenar={() => {}}>
        {(_, indice) => (
          <ReorderRow
            key="x"
            id="x"
            indice={indice}
            titulo={NOME}
            detalhe="4 séries · 8 a 10 reps · 90 s de descanso"
          />
        )}
      </ListaReordenavel>,
    );
    const titulo = screen.getByText(NOME);
    expect(titulo).not.toHaveClass("truncate");
    expect(titulo).toHaveClass("break-words");
    expect(screen.getByText(/4 séries/)).not.toHaveClass("truncate");
    const linha = screen.getByRole("listitem");
    expect(linha).toHaveClass("min-h-[72px]");
    expect(linha).not.toHaveClass("h-[72px]");
  });
});

describe("moverItem", () => {
  const itens = ["a", "b", "c", "d"];

  it("move para baixo e para cima sem alterar a lista original", () => {
    expect(moverItem(itens, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moverItem(itens, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(itens).toEqual(["a", "b", "c", "d"]);
  });
});
