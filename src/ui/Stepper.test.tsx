// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Stepper } from "./Stepper";

afterEach(cleanup);

const semanas = (n: number) => (n === 1 ? "1 semana" : `${n} semanas`);

function Exemplo({ inicial }: { inicial: number }) {
  const [valor, setValor] = useState(inicial);
  return <Stepper rotulo="Número de semanas" valor={valor} aoMudar={setValor} formatar={semanas} />;
}

const campo = () => screen.getByRole("spinbutton", { name: "Número de semanas" });
const menos = () => screen.getByRole("button", { name: "Diminuir número de semanas" });
const mais = () => screen.getByRole("button", { name: "Aumentar número de semanas" });

describe("Stepper", () => {
  it("mostra o valor por extenso, no singular e no plural", async () => {
    render(<Exemplo inicial={2} />);
    expect(campo()).toHaveValue("2 semanas");
    await userEvent.click(menos());
    expect(campo()).toHaveValue("1 semana");
  });

  it("− e + mudam o valor de um em um", async () => {
    render(<Exemplo inicial={8} />);
    await userEvent.click(mais());
    expect(campo()).toHaveValue("9 semanas");
    await userEvent.click(menos());
    await userEvent.click(menos());
    expect(campo()).toHaveValue("7 semanas");
  });

  it("no mínimo, o − fica desabilitado (regra 105)", () => {
    render(<Exemplo inicial={1} />);
    expect(menos()).toBeDisabled();
    expect(mais()).toBeEnabled();
  });

  it("aceita digitação direta, sem máximo (regra 105)", async () => {
    render(<Exemplo inicial={8} />);
    await userEvent.click(campo());
    expect(campo()).toHaveValue("8");
    await userEvent.clear(campo());
    await userEvent.type(campo(), "120{Enter}");
    expect(campo()).toHaveValue("120 semanas");
  });

  it("ao sair do campo, valor digitado abaixo do mínimo vira o mínimo", async () => {
    render(<Exemplo inicial={8} />);
    await userEvent.clear(campo());
    await userEvent.type(campo(), "0");
    await userEvent.tab();
    expect(campo()).toHaveValue("1 semana");
  });

  it("ao sair do campo vazio, mantém o valor anterior", async () => {
    render(<Exemplo inicial={8} />);
    await userEvent.clear(campo());
    await userEvent.tab();
    expect(campo()).toHaveValue("8 semanas");
  });

  it("ignora o que não é número na digitação", async () => {
    render(<Exemplo inicial={8} />);
    await userEvent.clear(campo());
    await userEvent.type(campo(), "1a2-");
    expect(campo()).toHaveValue("12");
  });

  it("setas do teclado mudam o valor, respeitando o mínimo", async () => {
    render(<Exemplo inicial={2} />);
    await userEvent.click(campo());
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    await userEvent.tab();
    expect(campo()).toHaveValue("1 semana");
  });
});
