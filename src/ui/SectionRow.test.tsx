// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionRow } from "./SectionRow";

afterEach(cleanup);

describe("SectionRow com nome longo (regra 165)", () => {
  const NOME = "Supino inclinado com halteres e pausa no peito (pegada neutra)";

  it("mostra o nome e o detalhe inteiros, sem classe de corte", () => {
    render(
      <SectionRow
        icone="fitness_center"
        iconeDireita="more_horiz"
        titulo={NOME}
        detalhe="Peito · Halteres · Banco inclinado"
      />,
    );
    const titulo = screen.getByText(NOME);
    expect(titulo).not.toHaveClass("truncate");
    expect(titulo).toHaveClass("break-words");
    expect(screen.getByText(/Banco inclinado/)).not.toHaveClass("truncate");
  });
});
