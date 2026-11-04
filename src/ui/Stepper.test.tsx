// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

afterEach(cleanup);

const semanas = (n: number) => (n === 1 ? "1 semana" : `${n} semanas`);

const ERRO = "Use de 1 a 104 semanas.";

function Exemplo({
  inicial,
  aoMudar,
  aoMudarValidade,
}: {
  inicial: number;
  aoMudar?: (valor: number) => void;
  aoMudarValidade?: (valido: boolean) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <Stepper
      rotulo="Número de semanas"
      valor={valor}
      aoMudar={(novo) => {
        setValor(novo);
        aoMudar?.(novo);
      }}
      formatar={semanas}
      maximo={104}
      erroMaximo={ERRO}
      aoMudarValidade={aoMudarValidade}
    />
  );
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

  it("aceita digitação direta", async () => {
    render(<Exemplo inicial={8} />);
    await userEvent.click(campo());
    expect(campo()).toHaveValue("8");
    await userEvent.clear(campo());
    await userEvent.type(campo(), "104{Enter}");
    expect(campo()).toHaveValue("104 semanas");
  });

  it("ao focar, o número já fica selecionado: o primeiro dígito substitui e não se perde", () => {
    render(<Exemplo inicial={8} />);
    act(() => campo().focus());
    const entrada = campo() as HTMLInputElement;
    expect(entrada).toHaveValue("8");
    expect([entrada.selectionStart, entrada.selectionEnd]).toEqual([0, 1]);
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

  describe("máximo", () => {
    it("no máximo, o + fica desabilitado e o − continua ativo", () => {
      render(<Exemplo inicial={104} />);
      expect(mais()).toBeDisabled();
      expect(menos()).toBeEnabled();
    });

    it("o + para no máximo", async () => {
      render(<Exemplo inicial={103} />);
      await userEvent.click(mais());
      expect(campo()).toHaveValue("104 semanas");
      expect(mais()).toBeDisabled();
    });

    it("a seta para cima do teclado para no máximo", async () => {
      render(<Exemplo inicial={104} />);
      await userEvent.click(campo());
      await userEvent.keyboard("{ArrowUp}");
      await userEvent.tab();
      expect(campo()).toHaveValue("104 semanas");
    });

    it.each([
      ["105", "105"],
      ["um número de 20 dígitos", "12345678901234567890"],
    ])("digitar %s mostra o erro e não vira valor da tela", async (_nome, numero) => {
      const aoMudar = vi.fn();
      const aoMudarValidade = vi.fn();
      render(<Exemplo inicial={8} aoMudar={aoMudar} aoMudarValidade={aoMudarValidade} />);
      await userEvent.clear(campo());
      await userEvent.type(campo(), numero);

      expect(screen.getByText(ERRO)).toBeVisible();
      expect(campo()).toHaveAttribute("aria-invalid", "true");
      expect(campo()).toHaveAccessibleDescription(ERRO);
      expect(aoMudarValidade).toHaveBeenLastCalledWith(false);

      await userEvent.tab();
      expect(campo()).toHaveValue(numero);
      expect(screen.getByText(ERRO)).toBeVisible();
      expect(aoMudar).not.toHaveBeenCalled();
      expect(aoMudarValidade).toHaveBeenLastCalledWith(false);
    });

    it.each([
      ["105", "105"],
      ["um número de 20 dígitos", "12345678901234567890"],
    ])("colar %s mostra o erro e não vira valor da tela", async (_nome, numero) => {
      const aoMudar = vi.fn();
      render(<Exemplo inicial={8} aoMudar={aoMudar} />);
      await userEvent.clear(campo());
      await userEvent.paste(numero);
      expect(screen.getByText(ERRO)).toBeVisible();
      await userEvent.tab();
      expect(aoMudar).not.toHaveBeenCalled();
    });

    it("voltar o foco ao campo mantém o número errado para corrigir", async () => {
      const aoMudarValidade = vi.fn();
      render(<Exemplo inicial={8} aoMudarValidade={aoMudarValidade} />);
      await userEvent.clear(campo());
      await userEvent.type(campo(), "105");
      await userEvent.tab();
      await userEvent.click(campo());
      expect(campo()).toHaveValue("105");

      await userEvent.clear(campo());
      await userEvent.type(campo(), "10");
      expect(screen.queryByText(ERRO)).not.toBeInTheDocument();
      expect(aoMudarValidade).toHaveBeenLastCalledWith(true);
      await userEvent.tab();
      expect(campo()).toHaveValue("10 semanas");
    });

    it("com número acima do máximo, o − leva ao máximo e tira o erro", async () => {
      const aoMudarValidade = vi.fn();
      render(<Exemplo inicial={8} aoMudarValidade={aoMudarValidade} />);
      await userEvent.clear(campo());
      await userEvent.type(campo(), "105");
      await userEvent.click(menos());
      expect(campo()).toHaveValue("104 semanas");
      expect(screen.queryByText(ERRO)).not.toBeInTheDocument();
      expect(aoMudarValidade).toHaveBeenLastCalledWith(true);
    });
  });
});
