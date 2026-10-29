// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataField } from "./FormField";

const original = HTMLInputElement.prototype.showPicker;
afterEach(() => {
  cleanup();
  HTMLInputElement.prototype.showPicker = original;
});

describe("DataField (regra 141)", () => {
  it("campo digitável com placeholder e teclado numérico", () => {
    render(<DataField rotulo="Data de nascimento" aoEscolherData={() => {}} />);
    const campo = screen.getByLabelText("Data de nascimento");
    expect(campo).toHaveAttribute("placeholder", "dd/mm/aaaa");
    expect(campo).toHaveAttribute("inputmode", "numeric");
  });

  it("o ícone de calendário abre o seletor do aparelho, e a data escolhida volta em dd/mm/aaaa", async () => {
    const showPicker = vi.fn();
    HTMLInputElement.prototype.showPicker = showPicker;
    const aoEscolherData = vi.fn();
    const { container } = render(
      <DataField rotulo="Data de nascimento" aoEscolherData={aoEscolherData} max="2026-10-29" />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir calendário" }));
    expect(showPicker).toHaveBeenCalled();
    const seletor = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(seletor).toHaveAttribute("max", "2026-10-29");
    expect(seletor).toHaveAttribute("min", "1900-01-01");
    fireEvent.change(seletor, { target: { value: "1995-03-15" } });
    expect(aoEscolherData).toHaveBeenCalledWith("15/03/1995");
  });

  it("sem showPicker no navegador, some o ícone e fica só a digitação", () => {
    // @ts-expect-error simula navegador sem a API
    delete HTMLInputElement.prototype.showPicker;
    render(<DataField rotulo="Data de nascimento" aoEscolherData={() => {}} />);
    expect(screen.queryByRole("button", { name: "Abrir calendário" })).toBeNull();
    expect(screen.getByLabelText("Data de nascimento")).toBeEnabled();
  });
});
