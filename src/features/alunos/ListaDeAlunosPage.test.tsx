// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListaDeAlunosPage } from "./ListaDeAlunosPage";
import type { LinhaDoAluno } from "./listaDeAlunos";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const sair = vi.fn();
vi.mock("@/lib/sessao", () => ({ sair: () => sair() }));

// As linhas da Lista · 1 do Figma ("Professor · Alunos").
const linhas: LinhaDoAluno[] = [
  {
    id: "a1",
    nome: "Beatriz Nunes",
    status: "convite_expirado",
    detalhe: "Convite expirou em 24/10",
  },
  {
    id: "a2",
    nome: "Carla Mendes",
    status: "sem_treino",
    detalhe: "Último treino em 20/09",
  },
  {
    id: "a3",
    nome: "Juliana Costa",
    status: "ativo",
    detalhe: "Treino concluído em 25/10 · treinou ontem",
  },
  {
    id: "a4",
    nome: "Marcos Lima",
    status: "quase_no_fim",
    detalhe: "Fim em 03/11 · treinou ontem",
  },
  {
    id: "a5",
    nome: "Rafael Torres",
    status: "convite_pendente",
    detalhe: "Convite enviado em 27/10 · vale até 03/11",
  },
  {
    id: "a6",
    nome: "Sérgio Dias",
    status: "convite_recusado",
    detalhe: "Recusou o convite em 27/10",
  },
];

function abrir(lista = linhas) {
  render(<ListaDeAlunosPage linhas={lista} />);
  return userEvent.setup();
}

// O jsdom ainda não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

beforeEach(() => {
  navegar.mockReset();
  sair.mockReset();
});
afterEach(cleanup);

describe("Lista de alunos (regras 54, 55, 59, 102, 114 e 147)", () => {
  it("mostra o resumo e uma linha por aluno com o chip do status, na ordem recebida", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Alunos" })).toBeVisible();
    expect(screen.getByText("6 alunos")).toBeVisible();
    const itens = screen.getAllByRole("listitem") as HTMLElement[];
    expect(itens.map((i) => within(i).getAllByText(/./)[0]?.textContent)).toEqual(
      linhas.map((l) => l.nome),
    );
    const chips = ["Convite expirado", "Sem treino", "Ativo", "Quase no fim"];
    chips.push("Convite pendente", "Convite recusado");
    chips.forEach((chip, i) => expect(within(itens[i]!).getByText(chip)).toBeVisible());
    expect(within(itens[0]!).getByText("Convite expirou em 24/10")).toBeVisible();
    expect(within(itens[4]!).getByText("Convite enviado em 27/10 · vale até 03/11")).toBeVisible();
    expect(within(itens[5]!).getByText("Recusou o convite em 27/10")).toBeVisible();
    expect(within(itens[1]!).getByText("Último treino em 20/09")).toBeVisible();
    expect(within(itens[3]!).getByText("Fim em 03/11 · treinou ontem")).toBeVisible();
  });

  it("um aluno: resumo no singular", () => {
    abrir(linhas.slice(1, 2));
    expect(screen.getByText("1 aluno")).toBeVisible();
  });

  it("nome longo trunca em 1 linha (regra 114)", () => {
    const nome = "Juliana Aparecida de Souza Costa Albuquerque Nogueira";
    abrir([{ ...linhas[2]!, nome }]);
    expect(screen.getByText(nome)).toHaveClass("truncate");
  });

  it("toda linha é botão com seta e abre a tela do aluno; a rota escolhe qual (regra 147 (4))", async () => {
    const usuario = abrir();
    const itens = screen.getAllByRole("listitem") as HTMLElement[];
    for (const [i, item] of itens.entries()) {
      const linha = within(item).getByRole("button");
      expect(linha).toHaveClass("active:bg-bg-surface-raised");
      await usuario.click(linha);
      expect(navegar).toHaveBeenLastCalledWith({
        to: "/professor/alunos/$alunoId",
        params: { alunoId: linhas[i]!.id },
      });
    }
  });

  it("busca sem acento e sem maiúsculas; limpar volta à lista inteira", async () => {
    const usuario = abrir();
    const busca = screen.getByRole("searchbox", { name: "Buscar aluno" });
    await usuario.type(busca, "SERGIO");
    expect(screen.getByText("1 resultado")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Sérgio Dias")).toBeVisible();
    await usuario.clear(busca);
    expect(screen.getByText("6 alunos")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("busca sem resultado", async () => {
    const usuario = abrir();
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar aluno" }), "Xavier");
    expect(screen.getByText("0 resultados")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Nenhum aluno encontrado" })).toBeVisible();
    expect(screen.getByText("Confira o nome ou busque só por parte do nome.")).toBeVisible();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("lista vazia: estado vazio, sem resumo e sem busca", () => {
    abrir([]);
    expect(screen.getByRole("heading", { name: "Você ainda não tem alunos" })).toBeVisible();
    expect(
      screen.getByText("Cadastre o primeiro aluno e envie o convite para o aluno criar o acesso."),
    ).toBeVisible();
    expect(screen.queryByText(/^\d+ alunos?$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("Cadastrar aluno fixo no rodapé leva ao cadastro", async () => {
    const usuario = abrir([]);
    await usuario.click(screen.getByRole("button", { name: "Cadastrar aluno" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor/cadastrar-aluno" });
  });

  it("Sair abre a folha sem o aviso da fila local; Continuar fecha, Sair encerra", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Sair" }));
    const folha = screen.getByRole("dialog", { name: "Sair do app?" });
    expect(
      within(folha).getByText("Você vai precisar entrar de novo com e-mail e senha."),
    ).toBeInTheDocument();
    expect(within(folha).queryByText(/aguardam envio/)).not.toBeInTheDocument();
    await usuario.click(within(folha).getByRole("button", { name: "Continuar no app" }));
    expect(folha).not.toHaveAttribute("open");
    expect(sair).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "Sair" }));
    await usuario.click(within(folha).getByRole("button", { name: "Sair" }));
    expect(sair).toHaveBeenCalledOnce();
  });
});
