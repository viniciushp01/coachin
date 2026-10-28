// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkConfirmacaoPage } from "./LinkConfirmacaoPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

beforeEach(() => navegar.mockReset());
afterEach(cleanup);

describe("link de confirmação que não vale (regra 128)", () => {
  it('vencido: "Este link expirou" com "Ir para o login"', async () => {
    const usuario = userEvent.setup();
    render(<LinkConfirmacaoPage situacao="expirado" />);

    expect(screen.getByRole("heading", { name: "Este link expirou" })).toBeVisible();
    expect(
      screen.getByText(
        "Os links para confirmar o e-mail valem por 1 dia. Entre com seu e-mail e senha para receber um novo link.",
      ),
    ).toBeVisible();
    // Não é "Pedir novo link": esse leva à redefinição de senha.
    expect(screen.queryByRole("button", { name: "Pedir novo link" })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Ir para o login" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar" });
  });

  it('já usado ou substituído: "Este link não vale mais" com "Ir para o login"', () => {
    render(<LinkConfirmacaoPage situacao="nao_vale_mais" />);

    expect(screen.getByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(
      screen.getByText(
        "Ele já foi usado ou foi substituído por um mais novo. Entre com seu e-mail e senha; se ainda faltar confirmar, você pode pedir outro.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Ir para o login" })).toBeVisible();
  });
});
