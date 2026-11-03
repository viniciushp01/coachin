// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StepIndicator } from "./StepIndicator";

afterEach(cleanup);

describe("StepIndicator", () => {
  it('mostra "PASSO 1 DE 2" e anuncia o passo como progresso', () => {
    render(<StepIndicator passo={1} total={2} />);
    expect(screen.getByText("Passo 1 de 2")).toBeVisible();
    const progresso = screen.getByRole("progressbar", { name: "Passo 1 de 2" });
    expect(progresso).toHaveAttribute("aria-valuenow", "1");
    expect(progresso).toHaveAttribute("aria-valuemax", "2");
  });

  it("acende uma barra por passo já alcançado", () => {
    const { container } = render(<StepIndicator passo={2} total={2} />);
    const barras = container.querySelectorAll("[data-barra]");
    expect([...barras].map((b) => b.getAttribute("data-barra"))).toEqual(["ativa", "ativa"]);
  });
});
