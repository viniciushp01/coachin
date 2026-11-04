// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DateField } from "./DateField";
import { SeletorDeData } from "./SeletorDeData";

// jsdom não implementa <dialog>.showModal; sem isto a folha fica fechada e fora da árvore acessível.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterEach(cleanup);

const dia = (nome: string) => screen.getByRole("button", { name: nome });

function abrir(props: Partial<Parameters<typeof SeletorDeData>[0]> = {}) {
  const aoConfirmar = vi.fn();
  const aoFechar = vi.fn();
  render(
    <SeletorDeData
      aberta
      hoje="2026-10-29"
      valor="2026-10-29"
      aoConfirmar={aoConfirmar}
      aoFechar={aoFechar}
      {...props}
    />,
  );
  return { aoConfirmar, aoFechar };
}

describe("SeletorDeData", () => {
  it("mostra título, mês, dias da semana, nota e botão do Figma", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Escolher início" })).toBeVisible();
    expect(screen.getByText("outubro de 2026")).toBeVisible();
    expect(
      screen.getByText(
        "Datas passadas ficam desabilitadas. O início pode ser hoje ou uma data futura.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmar início" })).toBeVisible();
  });

  it("a semana começa na segunda: 1º de outubro de 2026, uma quinta, tem 3 casas vazias antes", () => {
    abrir();
    const grade = screen.getByRole("group", { name: "Dias de outubro de 2026" });
    expect(grade.querySelectorAll("[data-vazio]")).toHaveLength(3);
  });

  it("desabilita datas anteriores a hoje e habilita hoje e as futuras", () => {
    abrir();
    expect(dia("28 de outubro de 2026")).toBeDisabled();
    expect(dia("1 de outubro de 2026")).toBeDisabled();
    expect(dia("29 de outubro de 2026")).toBeEnabled();
    expect(dia("31 de outubro de 2026")).toBeEnabled();
  });

  it("não confirma data passada, mesmo clicando nela", async () => {
    const { aoConfirmar } = abrir();
    await userEvent.click(dia("28 de outubro de 2026"));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar início" }));
    expect(aoConfirmar).toHaveBeenCalledWith("2026-10-29");
  });

  it("confirma a data futura escolhida, sem confirmar antes do botão", async () => {
    const { aoConfirmar } = abrir();
    await userEvent.click(dia("31 de outubro de 2026"));
    expect(aoConfirmar).not.toHaveBeenCalled();
    expect(dia("31 de outubro de 2026")).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar início" }));
    expect(aoConfirmar).toHaveBeenCalledWith("2026-10-31");
  });

  it("navega entre meses, atravessando o ano", async () => {
    abrir({ hoje: "2026-12-30", valor: "2026-12-30" });
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("janeiro de 2027")).toBeVisible();
    expect(dia("1 de janeiro de 2027")).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("novembro de 2026")).toBeVisible();
    expect(dia("30 de novembro de 2026")).toBeDisabled();
  });

  it("abre no mês da data escolhida e marca hoje como data atual", () => {
    abrir({ valor: "2026-11-03" });
    expect(screen.getByText("novembro de 2026")).toBeVisible();
    expect(dia("3 de novembro de 2026")).toHaveAttribute("aria-pressed", "true");
  });

  it("valor anterior a hoje não fica escolhido: vale hoje", async () => {
    const { aoConfirmar } = abrir({ valor: "2026-10-10" });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar início" }));
    expect(aoConfirmar).toHaveBeenCalledWith("2026-10-29");
  });

  it("calcula fevereiro de ano bissexto", async () => {
    abrir({ hoje: "2028-02-01", valor: "2028-02-01" });
    expect(dia("29 de fevereiro de 2028")).toBeEnabled();
  });
});

function Campo() {
  const [valor, setValor] = useState("2026-10-29");
  return <DateField rotulo="Início" valor={valor} hoje="2026-10-29" aoMudar={setValor} />;
}

describe("DateField", () => {
  it('mostra "Hoje · dd/mm/aaaa" quando a data é hoje e só a data nas outras', async () => {
    render(<Campo />);
    const campo = screen.getByRole("button", { name: "Início: Hoje · 29/10/2026" });
    expect(campo).toHaveTextContent("Hoje · 29/10/2026");

    await userEvent.click(campo);
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    await userEvent.click(dia("3 de novembro de 2026"));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar início" }));

    expect(screen.getByRole("button", { name: "Início: 03/11/2026" })).toHaveTextContent(
      "03/11/2026",
    );
    expect(screen.queryByRole("heading", { name: "Escolher início" })).not.toBeInTheDocument();
  });

  it("reabrir depois de desistir volta para a data confirmada", async () => {
    render(<Campo />);
    await userEvent.click(screen.getByRole("button", { name: "Início: Hoje · 29/10/2026" }));
    await userEvent.click(dia("31 de outubro de 2026"));
    await userEvent.keyboard("{Escape}");
    // jsdom não fecha <dialog> com Esc; o evento close é o que o navegador dispara.
    screen.getByRole("dialog").dispatchEvent(new Event("close"));
    await vi.waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Escolher início" })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Início: Hoje · 29/10/2026" }));
    expect(dia("29 de outubro de 2026")).toHaveAttribute("aria-pressed", "true");
    expect(dia("31 de outubro de 2026")).toHaveAttribute("aria-pressed", "false");
  });
});
