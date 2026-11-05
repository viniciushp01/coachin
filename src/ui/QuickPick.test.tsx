// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickPick } from "./QuickPick";

afterEach(cleanup);

describe("QuickPick", () => {
  it("diz se está selecionado e avisa o toque", async () => {
    const aoClicar = vi.fn();
    const { rerender } = render(
      <QuickPick selecionado={false} onClick={aoClicar}>
        60 s
      </QuickPick>,
    );
    const atalho = screen.getByRole("button", { name: "60 s" });
    expect(atalho).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(atalho);
    expect(aoClicar).toHaveBeenCalledTimes(1);

    rerender(<QuickPick selecionado>60 s</QuickPick>);
    expect(screen.getByRole("button", { name: "60 s" })).toHaveAttribute("aria-pressed", "true");
  });

  it("não envia o formulário em que está", async () => {
    const aoEnviar = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={aoEnviar}>
        <QuickPick selecionado={false}>90 s</QuickPick>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "90 s" }));
    expect(aoEnviar).not.toHaveBeenCalled();
  });
});
