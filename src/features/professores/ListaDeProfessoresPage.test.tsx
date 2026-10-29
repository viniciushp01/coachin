// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListaDeProfessoresPage } from "./ListaDeProfessoresPage";
import type { LinhaDeProfessor } from "./listaDeProfessores";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const linhas: LinhaDeProfessor[] = [
  { id: "c3", nome: "Bruno Dias", estado: "recusado", detalhe: "Recusou o convite em 27/10" },
  { id: "p1", nome: "Carlos Almeida", estado: "ativo", detalhe: "Professor desde 03/09" },
  { id: "c1", nome: "Fernanda Lopes", estado: "pendente", detalhe: "Convite válido até 29/10" },
  { id: "p2", nome: "Marina Prado", estado: "bloqueado", detalhe: "Acesso bloqueado" },
  { id: "c2", nome: "Ricardo Souza", estado: "expirado", detalhe: "Convite expirou em 25/10" },
];

function abrir(lista = linhas) {
  render(<ListaDeProfessoresPage linhas={lista} />);
  return userEvent.setup();
}

// O jsdom ainda não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

beforeEach(() => navegar.mockReset());
afterEach(cleanup);

describe("Lista de professores (regras 92, 102 e 114)", () => {
  it("mostra o resumo e uma linha por professor com o chip do estado, na ordem recebida", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Professores" })).toBeVisible();
    expect(screen.getByText("5 professores · 1 convite pendente")).toBeVisible();
    const itens = screen.getAllByRole("listitem");
    const item = (i: number) => itens[i] as HTMLElement;
    expect(itens.map((i) => within(i).getAllByText(/./)[0]?.textContent)).toEqual([
      "Bruno Dias",
      "Carlos Almeida",
      "Fernanda Lopes",
      "Marina Prado",
      "Ricardo Souza",
    ]);
    expect(within(item(0)).getByText("Convite recusado")).toBeVisible();
    expect(within(item(0)).getByText("Recusou o convite em 27/10")).toBeVisible();
    expect(within(item(1)).getByText("Ativo")).toBeVisible();
    expect(within(item(2)).getByText("Convite pendente")).toBeVisible();
    expect(within(item(3)).getByText("Bloqueado")).toBeVisible();
    expect(within(item(4)).getByText("Convite expirado")).toBeVisible();
  });

  it("nome longo trunca em 1 linha", () => {
    abrir([
      {
        id: "p1",
        estado: "ativo",
        detalhe: "Professor desde 03/09",
        nome: "Carlos Eduardo de Almeida Prado Nogueira Filho",
      },
    ]);
    expect(screen.getByText("Carlos Eduardo de Almeida Prado Nogueira Filho")).toHaveClass(
      "truncate",
    );
  });

  it("busca por nome e mostra a contagem de resultados", async () => {
    const usuario = abrir();
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar professor" }), "mar");
    expect(screen.getByText("1 resultado")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Marina Prado")).toBeVisible();
  });

  it("busca sem resultado", async () => {
    const usuario = abrir();
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar professor" }), "Xavier");
    expect(screen.getByText("0 resultados")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Nenhum professor encontrado" })).toBeVisible();
    expect(screen.getByText("Confira o nome ou busque só por parte dele.")).toBeVisible();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("lista vazia: estado vazio, sem busca", () => {
    abrir([]);
    expect(screen.getByRole("heading", { name: "Nenhum professor ainda" })).toBeVisible();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("um botão principal, fixo no rodapé, e sem navegação inferior", async () => {
    const usuario = abrir();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Convidar professor" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/admin/convidar-professor" });
  });

  it("Sair abre a folha sem o aviso da fila local (regra 145)", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Sair" }));
    const folha = screen.getByRole("dialog", { name: "Sair do app?" });
    expect(
      within(folha).getByText("Você vai precisar entrar de novo com e-mail e senha."),
    ).toBeInTheDocument();
    expect(within(folha).queryByText(/aguardam envio/)).not.toBeInTheDocument();
    expect(within(folha).getByRole("button", { name: "Continuar no app" })).toBeInTheDocument();
  });

  it("linhas ainda não abrem nada: sem botão nem seta (regra 145)", () => {
    abrir();
    expect(
      within(screen.getAllByRole("listitem")[0] as HTMLElement).queryByRole("button"),
    ).toBeNull();
  });
});
