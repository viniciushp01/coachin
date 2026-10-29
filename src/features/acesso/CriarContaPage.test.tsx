// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/ui";
import { CriarContaPage } from "./CriarContaPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const signUp = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => signUp(...args) } },
}));

const contaNova = { data: { user: { id: "u1", identities: [{ id: "i1" }] } }, error: null };
const contaQueJaExiste = { data: { user: { id: "u0", identities: [] } }, error: null };

function abrirTela(emailInicial?: string) {
  render(
    <ToastProvider>
      <CriarContaPage emailInicial={emailInicial} />
    </ToastProvider>,
  );
  return userEvent.setup();
}

async function criar(usuario: ReturnType<typeof userEvent.setup>, email: string, senha: string) {
  if (email) await usuario.type(screen.getByLabelText("E-mail"), email);
  if (senha) await usuario.type(screen.getByLabelText("Senha"), senha);
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
}

beforeEach(() => {
  navegar.mockReset();
  signUp.mockReset();
});
afterEach(cleanup);

describe("Criar acesso (regras 47, 78 e 89)", () => {
  it("mostra o subtítulo da conta aberta e a dica da senha", () => {
    abrirTela();
    expect(screen.getByRole("heading", { name: "Criar acesso" })).toBeVisible();
    expect(
      screen.getByText(
        "Crie seu acesso com seu e-mail. O treino aparece depois que um professor te convidar.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription(
      "Mínimo de 8 caracteres, com letras e números.",
    );
  });

  it("vem com o e-mail do convite preenchido e editável (regra 46)", async () => {
    const usuario = abrirTela("ana@exemplo.com");
    const campo = screen.getByLabelText("E-mail");
    expect(campo).toHaveValue("ana@exemplo.com");
    await usuario.clear(campo);
    await usuario.type(campo, "outra@exemplo.com");
    expect(campo).toHaveValue("outra@exemplo.com");
  });

  it("senha fraca ou e-mail inválido: erro no campo, sem criar a conta", async () => {
    const usuario = abrirTela();

    await criar(usuario, "ana@", "abcdefgh");

    expect(
      await screen.findByText("Digite um e-mail válido, como nome@exemplo.com."),
    ).toBeVisible();
    expect(
      screen.getByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('cria a conta e leva a "Confirme seu e-mail"', async () => {
    signUp.mockResolvedValue(contaNova);
    const usuario = abrirTela();

    await criar(usuario, " ana@exemplo.com ", "abc12345");

    expect(signUp).toHaveBeenCalledWith({
      email: "ana@exemplo.com",
      password: "abc12345",
      options: { emailRedirectTo: expect.stringMatching(/\/confirmar-email\?pedido=\d+$/) },
    });
    expect(navegar).toHaveBeenCalledWith({
      to: "/confirme-seu-email",
      search: { email: "ana@exemplo.com" },
    });
  });

  it.each([
    [
      "resposta sem identidade (confirmação ligada)",
      () => signUp.mockResolvedValue(contaQueJaExiste),
    ],
    [
      "erro user_already_exists",
      () =>
        signUp.mockResolvedValue({
          data: { user: null },
          error: { code: "user_already_exists", status: 422 },
        }),
    ],
  ])(
    "e-mail em uso (%s): erro no campo e atalho para entrar (regra 83)",
    async (_caso, preparar) => {
      preparar();
      const usuario = abrirTela();

      await criar(usuario, "ana@exemplo.com", "abc12345");

      expect(
        await screen.findByText(
          "E-mail em uso. Tente logar utilizando ele, ou solicite alteração de senha.",
        ),
      ).toBeVisible();
      expect(navegar).not.toHaveBeenCalled();

      await usuario.click(screen.getByRole("button", { name: "Entrar com este e-mail" }));
      expect(navegar).toHaveBeenCalledWith({ to: "/entrar", search: { email: "ana@exemplo.com" } });

      await usuario.click(screen.getByRole("button", { name: "Esqueci a senha" }));
      expect(navegar).toHaveBeenCalledWith({
        to: "/esqueci-a-senha",
        search: { email: "ana@exemplo.com" },
      });
    },
  );

  it("senha recusada pelo servidor vira erro no campo de senha", async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: { code: "weak_password", status: 422 },
    });
    const usuario = abrirTela();

    await criar(usuario, "ana@exemplo.com", "abc12345");

    expect(
      await screen.findByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
  });

  it("limite de envio de e-mails: toast da regra 130", async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    const usuario = abrirTela();

    await criar(usuario, "ana@exemplo.com", "abc12345");

    expect(await screen.findByText("Muitos envios. Espere um pouco.")).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });
});
