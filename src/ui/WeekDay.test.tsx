// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WeekDay } from "./WeekDay";

afterEach(cleanup);

const base = { inicial: "Q", numero: 29, rotulo: "Quinta, 29 de outubro" };

describe("WeekDay (Figma: Componentes › WeekDay)", () => {
  it("dia feito mostra a bolinha verde com a letra da ficha", () => {
    render(<WeekDay {...base} estado="padrao" marcas="C" />);
    const marca = screen.getByText("C");
    expect(marca).toHaveAttribute("data-marca", "feita");
    expect(marca).toHaveClass("bg-status-success");
  });

  it("dia sem registro não mostra marca", () => {
    const { container } = render(<WeekDay {...base} estado="padrao" marcas="" />);
    expect(container.querySelector("[data-marca]")).toBeNull();
  });

  it("hoje sem treino mostra o anel laranja e o fundo elevado", () => {
    const { container } = render(<WeekDay {...base} estado="hoje" marcas="" />);
    expect(container.querySelector("[data-marca]")).toHaveAttribute("data-marca", "hoje");
    expect(screen.getByRole("button")).toHaveClass("bg-bg-surface-raised");
    expect(screen.getByText("29")).toHaveClass("text-text-brand");
  });

  it("hoje já treinado mostra a bolinha verde", () => {
    render(<WeekDay {...base} estado="hoje" marcas="B" />);
    expect(screen.getByText("B")).toHaveAttribute("data-marca", "feita");
  });

  it("dia futuro mostra só um ponto e fica desativado", () => {
    const { container } = render(<WeekDay {...base} estado="futuro" marcas="" desativado />);
    expect(container.querySelector("[data-marca]")).toHaveAttribute("data-marca", "futuro");
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("duas fichas no dia aparecem juntas na mesma bolinha", () => {
    render(<WeekDay {...base} estado="padrao" marcas="AB" />);
    expect(screen.getByText("AB")).toHaveAttribute("data-marca", "feita");
  });

  it("toque chama aoEscolher e o nome acessível leva a data e a ficha", async () => {
    const aoEscolher = vi.fn();
    render(<WeekDay {...base} estado="padrao" marcas="C" aoEscolher={aoEscolher} />);
    await userEvent.click(screen.getByRole("button", { name: "Quinta, 29 de outubro, ficha C" }));
    expect(aoEscolher).toHaveBeenCalled();
  });
});
