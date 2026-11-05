// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const OPCOES = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "opcional", rotulo: "Opcional" },
  { valor: "nao", rotulo: "Não" },
];

function Exemplo() {
  const [valor, setValor] = useState("sim");
  return (
    <>
      <SegmentedControl rotulo="Modo de carga" opcoes={OPCOES} valor={valor} aoMudar={setValor} />
      <p>Valor: {valor}</p>
    </>
  );
}

const opcao = (name: string) => screen.getByRole("radio", { name });

afterEach(cleanup);

describe("SegmentedControl (regra 157 (5))", () => {
  it("é um grupo com o rótulo visível e só uma opção marcada", () => {
    render(<Exemplo />);
    expect(screen.getByRole("radiogroup", { name: "Modo de carga" })).toBeVisible();
    expect(screen.getByText("Modo de carga")).toBeVisible();
    expect(opcao("Sim")).toBeChecked();
    expect(opcao("Opcional")).not.toBeChecked();
    expect(opcao("Não")).not.toBeChecked();
  });

  it("tocar muda a opção, sem enviar o formulário em volta", async () => {
    let enviou = false;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviou = true;
        }}
      >
        <Exemplo />
      </form>,
    );
    await userEvent.setup().click(opcao("Não"));
    expect(opcao("Não")).toBeChecked();
    expect(opcao("Sim")).not.toBeChecked();
    expect(screen.getByText("Valor: nao")).toBeVisible();
    expect(enviou).toBe(false);
  });

  it("só a opção marcada entra na ordem do Tab", async () => {
    render(<Exemplo />);
    const u = userEvent.setup();
    await u.tab();
    expect(opcao("Sim")).toHaveFocus();
    await u.tab();
    expect(document.body).toHaveFocus();
  });

  it("as setas andam, marcam e dão a volta", async () => {
    render(<Exemplo />);
    const u = userEvent.setup();
    await u.tab();
    await u.keyboard("{ArrowRight}");
    expect(opcao("Opcional")).toBeChecked();
    expect(opcao("Opcional")).toHaveFocus();
    await u.keyboard("{ArrowDown}");
    expect(opcao("Não")).toBeChecked();
    await u.keyboard("{ArrowRight}");
    expect(opcao("Sim")).toBeChecked();
    expect(opcao("Sim")).toHaveFocus();
    await u.keyboard("{ArrowLeft}");
    expect(opcao("Não")).toBeChecked();
    await u.keyboard("{ArrowUp}");
    expect(opcao("Opcional")).toBeChecked();
  });
});
