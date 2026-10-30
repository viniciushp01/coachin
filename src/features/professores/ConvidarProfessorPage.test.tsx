// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp, type CodigoErro } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { ConvidarProfessorPage } from "./ConvidarProfessorPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
const rpc = vi.fn();
vi.mock("@/lib/rpc", () => ({ rpc: (...args: unknown[]) => rpc(...args) }));
const chamarFuncao = vi.fn();
vi.mock("@/lib/funcoes", () => ({
  chamarFuncao: (...args: unknown[]) => chamarFuncao(...args),
}));

const conviteCriado = { invite_id: "i1", token: "tok-prof", expires_at: "2026-10-30T12:00:00Z" };

function abrir() {
  render(
    <ToastProvider>
      <ConvidarProfessorPage />
    </ToastProvider>,
  );
  return userEvent.setup();
}

const gerar = () => screen.getByRole("button", { name: "Gerar convite" });

async function preencher(usuario: ReturnType<typeof userEvent.setup>, nome: string, email: string) {
  if (nome) await usuario.type(screen.getByLabelText("Nome"), nome);
  if (email) await usuario.type(screen.getByLabelText("E-mail"), email);
  await usuario.click(gerar());
}

beforeEach(() => {
  navegar.mockReset();
  rpc.mockReset();
});
afterEach(cleanup);

describe("Convidar professor (regras 87 e 92)", () => {
  it("pede nome e e-mail, com o aviso sobre conta de aluno e texto neutro", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Convidar professor" })).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("placeholder", "Nome do professor");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("placeholder", "nome@exemplo.com");
    expect(
      screen.getByText(
        "O convite vale só para o e-mail informado. A pessoa convidada recebe o link para ativar o acesso de professor.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/\bela\b/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Se este e-mail já tiver conta de aluno, o acesso de aluno será encerrado. Os dados de treino ficam guardados, sem acesso.",
      ),
    ).toBeVisible();
  });

  it("nome e e-mail vazios: erros no campo, sem gravar", async () => {
    const usuario = abrir();
    await usuario.click(gerar());
    expect(await screen.findByText("Digite o nome do professor.")).toBeVisible();
    expect(screen.getByText("Digite um e-mail válido, como nome@exemplo.com.")).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("envia nome e e-mail sem espaços nas pontas", async () => {
    rpc.mockResolvedValue(conviteCriado);
    const usuario = abrir();
    await preencher(usuario, "  Fernanda Lopes ", " fernanda@exemplo.com ");
    expect(rpc).toHaveBeenCalledWith("create_teacher_invite", {
      p_name: "Fernanda Lopes",
      p_email: "fernanda@exemplo.com",
    });
  });

  it.each<[CodigoErro, string]>([
    ["already_teacher", "Este e-mail já é de um professor."],
    ["email_is_admin", "Este e-mail é do administrador."],
    ["email_invalid", "Digite um e-mail válido, como nome@exemplo.com."],
  ])("erro %s do servidor aparece no campo de e-mail", async (codigo, mensagem) => {
    rpc.mockImplementation(() => Promise.reject(new ErroApp(codigo)));
    const usuario = abrir();
    await preencher(usuario, "Fernanda Lopes", "fernanda@exemplo.com");
    expect(await screen.findByText(mensagem)).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  it("outro erro do servidor vira toast", async () => {
    rpc.mockImplementation(() => Promise.reject(new ErroApp("forbidden")));
    const usuario = abrir();
    await preencher(usuario, "Fernanda Lopes", "fernanda@exemplo.com");
    expect(await screen.findByText("Você não tem acesso a isso.")).toBeVisible();
  });

  it("voltar leva à lista", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/admin" });
  });
});

describe("Convite gerado do professor (regra 92)", () => {
  const copiar = vi.fn();
  beforeEach(() => copiar.mockReset().mockResolvedValue(undefined));

  it('vale por 1 dia; "Enviar por e-mail" é o principal e "Copiar link" copia o link', async () => {
    rpc.mockResolvedValue(conviteCriado);
    const usuario = abrir();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: copiar },
      configurable: true,
    });
    await preencher(usuario, "Fernanda Lopes", "fernanda@exemplo.com");
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
    expect(
      screen.getByText(
        "O link de Fernanda Lopes é de uso único e vale por 1 dia. Envie agora para Fernanda ativar o acesso de professor.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(copiar).toHaveBeenCalledWith(`${window.location.origin}/convite/tok-prof`);
    expect(await screen.findByText("Link copiado.")).toBeVisible();
    expect(screen.getAllByRole("button").at(-2)).toHaveTextContent("Enviar por e-mail");
  });

  it("Enviar por e-mail manda só o token à função", async () => {
    rpc.mockResolvedValue(conviteCriado);
    chamarFuncao.mockReset().mockResolvedValue({ ok: true });
    const usuario = abrir();
    await preencher(usuario, "Fernanda Lopes", "fernanda@exemplo.com");
    await usuario.click(await screen.findByRole("button", { name: "Enviar por e-mail" }));
    expect(chamarFuncao).toHaveBeenCalledWith("enviar-convite", { token: "tok-prof" });
    expect(await screen.findByText("Convite enviado por e-mail.")).toBeVisible();
  });
});
