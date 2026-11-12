// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonthDay } from "./MonthDay";

afterEach(cleanup);

const base = { numero: 27, rotulo: "Terça, 27 de outubro" };

describe("MonthDay (Figma: Componentes › MonthDay)", () => {
  it("dia feito mostra a bolinha verde com a letra e a ficha no nome acessível", () => {
    render(<MonthDay {...base} estado="padrao" marcas="B" />);
    expect(screen.getByText("B")).toHaveAttribute("data-marca", "feita");
    expect(screen.getByRole("button", { name: "Terça, 27 de outubro, ficha B" })).toBeVisible();
  });

  it("dia sem registro mostra só o número", () => {
    const { container } = render(<MonthDay {...base} estado="padrao" marcas="" />);
    expect(container.querySelector("[data-marca]")).toBeNull();
    expect(screen.getByText("27")).toHaveClass("text-text-primary");
  });

  it("hoje tem fundo elevado e número laranja", () => {
    render(<MonthDay {...base} estado="hoje" marcas="" />);
    expect(screen.getByRole("button")).toHaveClass("bg-bg-surface-raised");
    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "date");
    expect(screen.getByText("27")).toHaveClass("text-text-brand");
  });

  it("dia futuro fica neutro e sem toque", async () => {
    const aoEscolher = vi.fn();
    render(<MonthDay {...base} estado="futuro" marcas="" aoEscolher={aoEscolher} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("27")).toHaveClass("text-text-secondary");
    await userEvent.setup().click(screen.getByRole("button"));
    expect(aoEscolher).not.toHaveBeenCalled();
  });

  it("selecionado ganha a borda; tocar avisa", async () => {
    const aoEscolher = vi.fn();
    render(<MonthDay {...base} estado="padrao" marcas="" selecionado aoEscolher={aoEscolher} />);
    expect(screen.getByRole("button")).toHaveClass("border-text-primary");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await userEvent.setup().click(screen.getByRole("button"));
    expect(aoEscolher).toHaveBeenCalledOnce();
  });
});
