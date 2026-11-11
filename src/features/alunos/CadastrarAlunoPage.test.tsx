// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { CadastrarAlunoPage } from "./CadastrarAlunoPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
const rpc = vi.fn();
vi.mock("@/lib/rpc", () => ({ rpc: (...args: unknown[]) => rpc(...args) }));

const alunoCriado = { student_id: "s1" };

function abrir() {
  render(
    <ToastProvider>
      <CadastrarAlunoPage />
    </ToastProvider>,
  );
  return userEvent.setup();
}

const cadastrar = () => screen.getByRole("button", { name: "Cadastrar aluno" });

beforeEach(() => {
  navegar.mockReset();
  rpc.mockReset();
});
afterEach(cleanup);

describe("Cadastrar aluno (regras 57, 109 e 164)", () => {
  it("mostra nome, e-mail e telefone opcionais e o aviso de WhatsApp", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Cadastrar aluno" })).toBeVisible();
    expect(
      screen.getByText("Você monta o treino e depois envia o convite para o aluno criar o acesso."),
    ).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("placeholder", "Nome do aluno");
    expect(screen.getByLabelText("E-mail (opcional)")).toBeVisible();
    expect(screen.getByLabelText("Telefone (opcional)")).toBeVisible();
    expect(screen.getByText("Sem e-mail? Sem problema")).toBeVisible();
    expect(
      screen.getByText(
        "Você pode enviar o link do convite por WhatsApp quando for a hora. O aluno escolhe o e-mail do acesso.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Gerar convite" })).not.toBeInTheDocument();
  });

  it("nome vazio, e-mail inválido e telefone incompleto: erros no campo, sem gravar", async () => {
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("E-mail (opcional)"), "rafael@exemplo");
    await usuario.type(screen.getByLabelText("Telefone (opcional)"), "3198765");
    await usuario.click(cadastrar());
    expect(await screen.findByText("Digite o nome do aluno.")).toBeVisible();
    expect(screen.getByText("Digite um e-mail válido, como nome@exemplo.com.")).toBeVisible();
    expect(screen.getByText("Digite um telefone com DDD, como (31) 91234-5678.")).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("só com o nome: cria o aluno, sem convite, e abre a tela dele", async () => {
    rpc.mockResolvedValue(alunoCriado);
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("Nome"), "  Rafael Torres ");
    await usuario.click(cadastrar());
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("create_student", { p_name: "Rafael Torres" });
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId",
      params: { alunoId: "s1" },
      replace: true,
    });
    expect(screen.queryByText("Convite gerado")).not.toBeInTheDocument();
  });

  it("com e-mail e telefone, envia os dois normalizados", async () => {
    rpc.mockResolvedValue(alunoCriado);
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.type(screen.getByLabelText("E-mail (opcional)"), " Rafael@Exemplo.com ");
    await usuario.type(screen.getByLabelText("Telefone (opcional)"), "31987654321");
    expect(screen.getByLabelText("Telefone (opcional)")).toHaveValue("(31) 98765-4321");
    await usuario.click(cadastrar());
    expect(rpc).toHaveBeenCalledWith("create_student", {
      p_name: "Rafael Torres",
      p_email: "Rafael@Exemplo.com",
      p_phone: "+5531987654321",
    });
  });

  it("e-mail que já é de outro aluno dele: erro no campo de e-mail", async () => {
    rpc.mockRejectedValue(new ErroApp("student_email_taken"));
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.type(screen.getByLabelText("E-mail (opcional)"), "rafael@exemplo.com");
    await usuario.click(cadastrar());
    expect(await screen.findByText("Você já tem um aluno com este e-mail.")).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("outro erro: toast, e o formulário continua", async () => {
    rpc.mockRejectedValue(new ErroApp("forbidden"));
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.click(cadastrar());
    expect(await screen.findByText("Você não tem acesso a isso.")).toBeVisible();
    expect(cadastrar()).toBeEnabled();
  });

  it("voltar leva à lista", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor" });
  });
});
