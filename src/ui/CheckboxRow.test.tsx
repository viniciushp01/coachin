// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheckboxRow } from "./CheckboxRow";

afterEach(cleanup);

function Exemplo() {
  const [marcada, setMarcada] = useState(false);
  return (
    <CheckboxRow checked={marcada} onChange={(e) => setMarcada(e.target.checked)}>
      Li e entendi que o professor acessa esses dados para montar o meu treino.
    </CheckboxRow>
  );
}

describe("CheckboxRow", () => {
  it("é uma caixa de seleção com o texto como rótulo", () => {
    render(<Exemplo />);
    expect(
      screen.getByRole("checkbox", {
        name: "Li e entendi que o professor acessa esses dados para montar o meu treino.",
      }),
    ).not.toBeChecked();
  });

  it("marca tocando no texto e desmarca de novo", async () => {
    const usuario = userEvent.setup();
    render(<Exemplo />);
    const caixa = screen.getByRole("checkbox");
    await usuario.click(screen.getByText(/Li e entendi/));
    expect(caixa).toBeChecked();
    await usuario.click(caixa);
    expect(caixa).not.toBeChecked();
  });

  it("marca pelo teclado (espaço)", async () => {
    const usuario = userEvent.setup();
    render(<Exemplo />);
    await usuario.tab();
    await usuario.keyboard(" ");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
