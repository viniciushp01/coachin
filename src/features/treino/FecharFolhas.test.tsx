// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { FolhaCarga } from "@/features/aluno/FolhaCarga";
import { SeletorDeData } from "@/ui/SeletorDeData";
import { FolhaContinuar } from "./FolhaContinuar";
import { FolhaDescartar } from "./FolhaDescartar";
import { FolhaDoExercicio } from "./FolhaDoExercicio";
import { FolhaOcultar } from "./FolhaOcultar";
import { FolhaOpcoesDoExercicio } from "./FolhaOpcoesDoExercicio";
import { FolhaRemoverFicha } from "./FolhaRemoverFicha";

const sair = vi.hoisted(() => vi.fn());
vi.mock("@/lib/sessao", () => ({ sair }));

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

/** O que a folha pode fazer: fechar (seguro) ou confirmar (não pode acontecer ao fechar). */
const fechar = vi.fn();
const confirmar = vi.fn();

const FOLHAS: [string, ReactElement][] = [
  [
    "Descartar alterações?",
    <FolhaDescartar
      aberta
      aviso={{ titulo: "t", texto: "x" }}
      aoContinuar={fechar}
      aoDescartar={confirmar}
    />,
  ],
  [
    "Remover a Ficha A?",
    <FolhaRemoverFicha aberta letra="A" aoManter={fechar} aoRemover={confirmar} />,
  ],
  [
    "Ocultar da busca?",
    <FolhaOcultar nome="Supino" gravando={false} aoFechar={fechar} aoConfirmar={confirmar} />,
  ],
  ["Sair do app?", <FolhaSair aberta aoFechar={fechar} />],
  [
    "Carga",
    <FolhaCarga
      exercicio={{ nome: "Supino", carga: undefined }}
      ocupado={false}
      aoFechar={fechar}
      aoSalvar={confirmar}
    />,
  ],
  [
    "Escolher início",
    <SeletorDeData
      aberta
      aoFechar={fechar}
      hoje="2026-11-06"
      valor="2026-11-06"
      aoConfirmar={confirmar}
    />,
  ],
  [
    "Supino",
    <FolhaDoExercicio
      nome="Supino"
      medida="reps"
      aoFechar={fechar}
      aoSalvar={confirmar}
      aoRemover={confirmar}
    />,
  ],
  [
    "Supino",
    <FolhaOpcoesDoExercicio
      nome="Supino"
      aoFechar={fechar}
      aoAjustar={confirmar}
      aoOcultar={confirmar}
    />,
  ],
  [
    "Continuar de onde parou?",
    <FolhaContinuar
      aberta
      nome="Juliana"
      texto="x"
      aoContinuar={fechar}
      aoComecarDeNovo={confirmar}
    />,
  ],
];

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

// Arrastar, tocar fora e Esc passam todos por `aoFechar` da folha (Sheet.test.tsx).
describe("fechar uma folha nunca confirma nada (regra 160)", () => {
  it.each(FOLHAS)("%s", (titulo, folha) => {
    render(folha);
    fireEvent.click(screen.getByTestId("escurecimento"));
    expect(screen.getByRole("dialog", { name: titulo })).toBeInTheDocument();
    expect(fechar).toHaveBeenCalledOnce();
    expect(confirmar).not.toHaveBeenCalled();
    expect(sair).not.toHaveBeenCalled();
  });
});
