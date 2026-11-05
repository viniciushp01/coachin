// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NumberField } from "./NumberField";

afterEach(cleanup);

describe("NumberField", () => {
  it("abre o teclado numérico", () => {
    render(<NumberField aria-label="Séries" />);
    const campo = screen.getByLabelText("Séries");
    expect(campo).toHaveAttribute("inputmode", "numeric");
    expect(campo).toHaveAttribute("pattern", "[0-9]*");
  });

  it("suffix mostra a unidade; left e center não", () => {
    const { rerender } = render(<NumberField aria-label="Tempo" formato="suffix" />);
    expect(screen.getByText("s")).toBeInTheDocument();
    rerender(<NumberField aria-label="Tempo" formato="center" />);
    expect(screen.queryByText("s")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tempo")).toHaveClass("text-center");
  });

  it("inválido marca o campo", () => {
    render(<NumberField aria-label="Séries" invalido />);
    expect(screen.getByLabelText("Séries")).toBeInvalid();
  });
});
