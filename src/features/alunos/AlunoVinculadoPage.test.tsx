// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlunoVinculadoPage } from "./AlunoVinculadoPage";
import type { AlunoVinculado } from "./alunoVinculado";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

// Figma "Professor · Acompanhar", Aluno · 1 Resumo.
const comTreino: AlunoVinculado = {
  id: "a1",
  nome: "Vinicius Alves",
  status: "ativo",
  treino: {
    nome: "Hipertrofia · Fase 2",
    situacao: "Semana 4 de 8",
    progresso: 25 / 56,
    feitos: 12,
    inicio: "05/10",
    fim: "29/11",
  },
  agendado: false,
  acoes: ["editar", "agendar"],
};

// Figma Aluno · 3 Sem treino.
const semTreino: AlunoVinculado = {
  id: "a2",
  nome: "Carla Mendes",
  status: "sem_treino",
  treino: null,
  agendado: false,
  acoes: ["criar"],
};

beforeEach(() => navegar.mockReset());
afterEach(cleanup);

describe("Tela do aluno vinculado (regras 5, 10, 68, 114 e 144)", () => {
  it("mostra o nome, o chip do status e o cartão do treino", () => {
    render(<AlunoVinculadoPage aluno={comTreino} />);
    expect(screen.getByRole("heading", { name: "Vinicius Alves" })).toBeVisible();
    expect(screen.getByText("Ativo")).toBeVisible();
    expect(screen.getByText("Treino ativo")).toBeVisible();
    expect(screen.getByText("Hipertrofia · Fase 2")).toBeVisible();
    expect(screen.getByText("Semana 4 de 8")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByText("treinos feitos")).toBeVisible();
    expect(screen.getByText("Início 05/10")).toBeVisible();
    expect(screen.getByText("Fim 29/11")).toBeVisible();
    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({
      width: `${(25 / 56) * 100}%`,
    });
    expect(screen.queryByText("Sem treino ativo")).not.toBeInTheDocument();
  });

  it("um treino feito fica no singular", () => {
    const treino = { ...comTreino.treino!, feitos: 1 };
    render(<AlunoVinculadoPage aluno={{ ...comTreino, treino }} />);
    expect(screen.getByText("treino feito")).toBeVisible();
  });

  it("treino concluído: troca a semana e enche a barra (regra 5)", () => {
    const treino = { ...comTreino.treino!, situacao: "Treino concluído", progresso: 1 };
    render(<AlunoVinculadoPage aluno={{ ...comTreino, treino }} />);
    expect(screen.getByText("Treino concluído")).toBeVisible();
    expect(screen.queryByText(/^Semana/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({ width: "100%" });
  });

  it("sem treino ativo: aviso com o primeiro nome e sem cartão (regra 144)", () => {
    render(<AlunoVinculadoPage aluno={semTreino} />);
    expect(screen.getByText("Sem treino")).toBeVisible();
    expect(screen.getByText("Sem treino ativo")).toBeVisible();
    expect(
      screen.getByText("Carla não tem treino ativo. Crie um para Carla voltar a treinar."),
    ).toBeVisible();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it('sem treino ativo e com agendado: sem o aviso "Sem treino ativo" (regra 152 (4))', () => {
    render(<AlunoVinculadoPage aluno={{ ...semTreino, agendado: true, acoes: [] }} />);
    expect(screen.queryByText("Sem treino ativo")).not.toBeInTheDocument();
  });

  it("nome longo trunca em 1 linha (regra 114), no título e no cartão", () => {
    const nome = "Juliana Aparecida de Souza Costa Albuquerque Nogueira";
    const treino = { ...comTreino.treino!, nome: `Treino de ${nome}` };
    render(<AlunoVinculadoPage aluno={{ ...comTreino, nome, treino }} />);
    expect(screen.getByRole("heading", { name: nome })).toHaveClass("truncate");
    expect(screen.getByText(`Treino de ${nome}`)).toHaveClass("truncate");
  });

  it("voltar leva à lista", async () => {
    render(<AlunoVinculadoPage aluno={comTreino} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor" });
  });
});

describe("Rodapé: o botão só aparece quando o destino existe", () => {
  it("editar e agendar ainda não têm destino, e nada aparece desabilitado", () => {
    render(<AlunoVinculadoPage aluno={comTreino} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([""]);
  });

  it("Criar treino leva ao início da montagem (#90)", async () => {
    render(<AlunoVinculadoPage aluno={semTreino} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar treino" }));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId/criar-treino",
      params: { alunoId: "a2" },
    });
  });

  it("com destino, o botão navega; Criar treino é o principal", async () => {
    const destino = { to: "/professor/cadastrar-aluno" } as const;
    render(<AlunoVinculadoPage aluno={semTreino} destinos={{ criar: () => destino }} />);
    const criar = screen.getByRole("button", { name: "Criar treino" });
    expect(criar).toHaveClass("bg-bg-brand");
    await userEvent.setup().click(criar);
    expect(navegar).toHaveBeenCalledWith(destino);
  });

  it("Editar e Agendar ficam no contorno, e só os que têm destino aparecem", () => {
    const destino = { to: "/professor" } as const;
    render(<AlunoVinculadoPage aluno={comTreino} destinos={{ editar: () => destino }} />);
    expect(screen.getByRole("button", { name: "Editar treino" })).not.toHaveClass("bg-bg-brand");
    expect(screen.queryByRole("button", { name: "Agendar novo treino" })).toBeNull();
  });
});
