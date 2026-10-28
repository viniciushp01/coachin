// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/ui";
import { ConfiraEmailPage } from "./ConfiraEmailPage";
import { EsqueciSenhaPage } from "./EsqueciSenhaPage";
import { NovaSenhaPage } from "./NovaSenhaPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => updateUser(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  },
}));

function abrir(tela: ReactNode) {
  render(<ToastProvider>{tela}</ToastProvider>);
  return userEvent.setup();
}

beforeEach(() => {
  navegar.mockReset();
  resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  updateUser.mockReset().mockResolvedValue({ data: {}, error: null });
  signOut.mockReset().mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("Esqueci a senha · pedir e-mail (regra 50)", () => {
  it('envia o link e leva a "Confira seu e-mail"', async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    const usuario = abrir(<EsqueciSenhaPage />);

    await usuario.type(screen.getByLabelText("E-mail"), " ana@exemplo.com ");
    await usuario.click(screen.getByRole("button", { name: "Enviar link" }));

    // A hora do pedido vai no endereço de volta para separar link vencido de link já usado.
    expect(resetPasswordForEmail).toHaveBeenCalledWith("ana@exemplo.com", {
      redirectTo: `${location.origin}/nova-senha?pedido=1800000000000`,
    });
    expect(navegar).toHaveBeenCalledWith({
      to: "/confira-seu-email",
      search: { email: "ana@exemplo.com" },
    });
    vi.restoreAllMocks();
  });

  it("vem com o e-mail preenchido (atalhos do Login e do e-mail em uso)", () => {
    abrir(<EsqueciSenhaPage emailInicial="ana@exemplo.com" />);
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com");
  });

  it("e-mail inválido: erro no campo, sem enviar", async () => {
    const usuario = abrir(<EsqueciSenhaPage />);

    await usuario.type(screen.getByLabelText("E-mail"), "ana@");
    await usuario.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(
      await screen.findByText("Digite um e-mail válido, como nome@exemplo.com."),
    ).toBeVisible();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("limite de envio: toast da regra 130", async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    const usuario = abrir(<EsqueciSenhaPage />);

    await usuario.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByText("Muitos envios. Espere um pouco.")).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe("Confira seu e-mail (regras 88 e 100)", () => {
  it("informa a validade de 1 dia e reenvia o link", async () => {
    const usuario = abrir(<ConfiraEmailPage email="ana@exemplo.com" />);

    expect(
      screen.getByText(
        "Enviamos um link para ana@exemplo.com. Toque nele para criar uma nova senha. O link vale por 1 dia.",
      ),
    ).toBeVisible();

    await usuario.click(screen.getByRole("button", { name: "Não recebeu? Reenviar link" }));

    expect(resetPasswordForEmail).toHaveBeenCalledWith("ana@exemplo.com", {
      redirectTo: expect.stringMatching(/\/nova-senha\?pedido=\d+$/),
    });
    expect(screen.getByRole("button", { name: "Reenviar em 60 s" })).toBeDisabled();
  });

  it('"Voltar ao login" leva ao Login com o e-mail', async () => {
    const usuario = abrir(<ConfiraEmailPage email="ana@exemplo.com" />);
    await usuario.click(screen.getByRole("button", { name: "Voltar ao login" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar", search: { email: "ana@exemplo.com" } });
  });
});

describe("Volta do link", () => {
  it('vencido: "Este link expirou" com "Pedir novo link" (regra 88)', async () => {
    const usuario = abrir(<NovaSenhaPage situacao="expirado" />);

    expect(screen.getByRole("heading", { name: "Este link expirou" })).toBeVisible();
    expect(
      screen.getByText(
        "Os links para criar uma nova senha valem por 1 dia. Peça um novo link e tente de novo.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Pedir novo link" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/esqueci-a-senha" });
  });

  it('já usado ou substituído: "Este link não vale mais" (regra 100)', () => {
    abrir(<NovaSenhaPage situacao="nao_vale_mais" />);

    expect(screen.getByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(
      screen.getByText(
        "Ele já foi usado ou foi substituído por um mais novo. Se ainda precisar, peça um novo link.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Pedir novo link" })).toBeVisible();
  });
});

describe("Criar nova senha (regras 47, 50, 78 e 121)", () => {
  it("senha fraca: erro no campo, sem trocar", async () => {
    const usuario = abrir(<NovaSenhaPage situacao="valido" />);

    await usuario.type(screen.getByLabelText("Nova senha"), "abcdefgh");
    await usuario.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(
      await screen.findByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('salva, desconecta todos os aparelhos e mostra "Senha alterada"', async () => {
    const usuario = abrir(<NovaSenhaPage situacao="valido" />);

    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription(
      "Mínimo de 8 caracteres, com letras e números.",
    );
    await usuario.type(screen.getByLabelText("Nova senha"), "nova12345");
    await usuario.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(updateUser).toHaveBeenCalledWith({ password: "nova12345" });
    // Regra 121: os outros aparelhos saem; este também, pois o fluxo segue para o Login.
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(await screen.findByRole("heading", { name: "Senha alterada" })).toBeVisible();
    expect(screen.getByText("Pronto! Agora você já pode entrar com a nova senha.")).toBeVisible();

    await usuario.click(screen.getByRole("button", { name: "Ir para o login" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar" });
  });

  it("senha recusada pelo servidor vira erro no campo", async () => {
    updateUser.mockResolvedValue({ data: {}, error: { code: "weak_password", status: 422 } });
    const usuario = abrir(<NovaSenhaPage situacao="valido" />);

    await usuario.type(screen.getByLabelText("Nova senha"), "nova12345");
    await usuario.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(
      await screen.findByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
    expect(signOut).not.toHaveBeenCalled();
  });
});
