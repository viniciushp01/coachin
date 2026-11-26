// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/ui";
import { ConfirmarEmailPage } from "./ConfirmarEmailPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const verifyOtp = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtp(...args),
      signOut: (...args: unknown[]) => signOut(...args),
      getSession: vi.fn(),
    },
  },
}));

const tokenGasto = {
  data: { user: null, session: null },
  error: { code: "otp_expired", status: 403, message: "Token has expired or is invalid" },
};

function abrir(props: Partial<Parameters<typeof ConfirmarEmailPage>[0]> = {}) {
  return render(
    <ToastProvider>
      <ConfirmarEmailPage tokenHash="abc" {...props} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  navegar.mockReset();
  verifyOtp.mockReset();
  signOut.mockReset().mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe('"Confirmar e-mail" pelo toque (regra 176)', () => {
  it("abrir o link mostra o botão e não gasta o token", () => {
    abrir();

    expect(screen.getByRole("heading", { name: "Confirmar e-mail" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmar e-mail" })).toBeVisible();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("o toque confirma uma vez e leva ao Login com o e-mail e o convite", async () => {
    const usuario = userEvent.setup();
    verifyOtp.mockResolvedValue({
      data: { user: { email: "ana@exemplo.com" }, session: {} },
      error: null,
    });
    abrir({ convite: "abc23xyz" });

    await usuario.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "abc" });
    expect(navegar).toHaveBeenCalledWith({
      to: "/entrar",
      search: { email: "ana@exemplo.com", confirmado: true, convite: "abc23xyz" },
      replace: true,
    });
  });

  it('token já usado: "Este link não vale mais" com "Se você já confirmou, é só entrar"', async () => {
    const usuario = userEvent.setup();
    verifyOtp.mockResolvedValue(tokenGasto);
    abrir({ pedidoEm: Date.now() - 60 * 60 * 1000 });

    await usuario.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(await screen.findByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(screen.getByText(/Se você já confirmou, é só entrar\./)).toBeVisible();
    expect(screen.getByRole("button", { name: "Ir para o login" })).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('token vencido (pedido com mais de 1 dia): "Este link expirou"', async () => {
    const usuario = userEvent.setup();
    verifyOtp.mockResolvedValue(tokenGasto);
    abrir({ pedidoEm: Date.now() - 25 * 60 * 60 * 1000 });

    await usuario.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(await screen.findByRole("heading", { name: "Este link expirou" })).toBeVisible();
  });

  it("sem conexão: toast de erro e o botão continua para tentar de novo", async () => {
    const usuario = userEvent.setup();
    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { status: 0, message: "Failed to fetch" },
    });
    abrir();

    await usuario.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(await screen.findByRole("button", { name: "Confirmar e-mail" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Este link não vale mais" })).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });
});
