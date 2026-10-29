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

const conviteCriado = {
  student_id: "s1",
  invite_id: "i1",
  token: "tok-123",
  expires_at: "2026-11-05T12:00:00Z",
};

function abrir() {
  render(
    <ToastProvider>
      <CadastrarAlunoPage />
    </ToastProvider>,
  );
  return userEvent.setup();
}

const gerar = () => screen.getByRole("button", { name: "Gerar convite" });

beforeEach(() => {
  navegar.mockReset();
  rpc.mockReset();
});
afterEach(cleanup);

describe("Cadastrar aluno (regras 46, 57 e 109)", () => {
  it("mostra nome, e-mail e telefone opcionais e o aviso de WhatsApp", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Cadastrar aluno" })).toBeVisible();
    expect(
      screen.getByText("Depois você gera o convite para o aluno criar o acesso."),
    ).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("placeholder", "Nome do aluno");
    expect(screen.getByLabelText("E-mail (opcional)")).toBeVisible();
    expect(screen.getByLabelText("Telefone (opcional)")).toBeVisible();
    expect(screen.getByText("Sem e-mail? Sem problema")).toBeVisible();
    expect(
      screen.getByText(
        "Você pode enviar o link do convite por WhatsApp. O aluno escolhe o e-mail do acesso.",
      ),
    ).toBeVisible();
  });

  it("nome vazio, e-mail inválido e telefone incompleto: erros no campo, sem gravar", async () => {
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("E-mail (opcional)"), "rafael@exemplo");
    await usuario.type(screen.getByLabelText("Telefone (opcional)"), "3198765");
    await usuario.click(gerar());
    expect(await screen.findByText("Digite o nome do aluno.")).toBeVisible();
    expect(screen.getByText("Digite um e-mail válido, como nome@exemplo.com.")).toBeVisible();
    expect(screen.getByText("Digite um telefone com DDD, como (31) 91234-5678.")).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("só com o nome: gera o convite sem e-mail nem telefone", async () => {
    rpc.mockResolvedValue(conviteCriado);
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("Nome"), "  Rafael Torres ");
    await usuario.click(gerar());
    expect(rpc).toHaveBeenCalledWith("create_student_with_invite", { p_name: "Rafael Torres" });
  });

  it("com e-mail e telefone, envia os dois normalizados", async () => {
    rpc.mockResolvedValue(conviteCriado);
    const usuario = abrir();
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.type(screen.getByLabelText("E-mail (opcional)"), " Rafael@Exemplo.com ");
    await usuario.type(screen.getByLabelText("Telefone (opcional)"), "31987654321");
    expect(screen.getByLabelText("Telefone (opcional)")).toHaveValue("(31) 98765-4321");
    await usuario.click(gerar());
    expect(rpc).toHaveBeenCalledWith("create_student_with_invite", {
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
    await usuario.click(gerar());
    expect(await screen.findByText("Você já tem um aluno com este e-mail.")).toBeVisible();
  });

  it("voltar leva à lista", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor" });
  });
});

describe("Convite gerado (regras 46 e 57)", () => {
  const copiar = vi.fn();
  // Depois do userEvent.setup(), que instala a sua própria área de transferência.
  function abrirComAreaDeTransferencia(writeText: (texto: string) => Promise<void> = copiar) {
    const usuario = abrir();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    return usuario;
  }
  beforeEach(() => copiar.mockReset().mockResolvedValue(undefined));

  it("sem e-mail: Copiar link (principal) e Voltar à lista", async () => {
    rpc.mockResolvedValue(conviteCriado);
    const usuario = abrirComAreaDeTransferencia();
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.click(gerar());
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
    expect(
      screen.getByText(
        "O link de Rafael Torres é de uso único e vale por 7 dias. Copie e envie por WhatsApp ou outro app.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(copiar).toHaveBeenCalledWith(`${window.location.origin}/convite/tok-123`);
    expect(await screen.findByText("Link copiado.")).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Voltar à lista" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor" });
  });

  it("com e-mail: o texto pede para enviar agora; até o envio por e-mail (#52), Copiar link é o principal", async () => {
    rpc.mockResolvedValue(conviteCriado);
    const usuario = abrirComAreaDeTransferencia();
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.type(screen.getByLabelText("E-mail (opcional)"), "rafael@exemplo.com");
    await usuario.click(gerar());
    expect(
      await screen.findByText(
        "O link de Rafael Torres é de uso único e vale por 7 dias. Envie agora para criar o acesso.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Enviar por e-mail" })).toBeNull();
  });

  it("sem acesso à área de transferência: toast de erro, o convite continua na tela", async () => {
    rpc.mockResolvedValue(conviteCriado);
    // Função comum: o espião do Vitest acompanha a promessa e acusaria a rejeição como não tratada.
    const usuario = abrirComAreaDeTransferencia(() => Promise.reject(new Error("negado")));
    await usuario.type(screen.getByLabelText("Nome"), "Rafael Torres");
    await usuario.click(gerar());
    await usuario.click(await screen.findByRole("button", { name: "Copiar link" }));
    expect(await screen.findByText("Não foi possível copiar o link.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Convite gerado" })).toBeVisible();
  });
});
