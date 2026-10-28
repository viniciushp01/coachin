// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/ui";
import { ConfirmeEmailPage } from "./ConfirmeEmailPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const resend = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { resend: (...args: unknown[]) => resend(...args) } },
}));

function abrirTela() {
  render(
    <ToastProvider>
      <ConfirmeEmailPage email="ana@exemplo.com" />
    </ToastProvider>,
  );
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  navegar.mockReset();
  resend.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Confirme seu e-mail (regras 89, 100 e 130)", () => {
  it("diz para onde foi o link e que ele vale por 1 dia", () => {
    abrirTela();
    expect(screen.getByRole("heading", { name: "Confirme seu e-mail" })).toBeVisible();
    expect(
      screen.getByText(
        "Enviamos um link para ana@exemplo.com. Toque nele para ativar sua conta. O link vale por 1 dia.",
      ),
    ).toBeVisible();
  });

  it("vindo do login, avisa que o e-mail ainda não foi confirmado (regra 127)", () => {
    render(
      <ToastProvider>
        <ConfirmeEmailPage email="ana@exemplo.com" doLogin />
      </ToastProvider>,
    );
    expect(
      screen.getByText(
        "Seu e-mail ainda não foi confirmado. Enviamos um link para ana@exemplo.com. Toque nele para ativar sua conta. O link vale por 1 dia.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Não recebeu? Reenviar link" })).toBeEnabled();
  });

  it('"Reenviar link" manda outro e fica desabilitado por 60 s, com contagem', async () => {
    resend.mockResolvedValue({ data: {}, error: null });
    const usuario = abrirTela();

    await usuario.click(screen.getByRole("button", { name: "Não recebeu? Reenviar link" }));

    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ana@exemplo.com",
      options: { emailRedirectTo: `${location.origin}/entrar` },
    });
    expect(screen.getByRole("button", { name: "Reenviar em 60 s" })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(screen.getByRole("button", { name: "Reenviar em 45 s" })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(45_000));
    expect(screen.getByRole("button", { name: "Não recebeu? Reenviar link" })).toBeEnabled();
  });

  it("limite de envio: toast e o botão continua disponível", async () => {
    resend.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    const usuario = abrirTela();

    await usuario.click(screen.getByRole("button", { name: "Não recebeu? Reenviar link" }));

    expect(await screen.findByText("Muitos envios. Espere um pouco.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Não recebeu? Reenviar link" })).toBeEnabled();
  });

  it('"Voltar ao login" leva ao Login com o e-mail preenchido', async () => {
    const usuario = abrirTela();

    await usuario.click(screen.getByRole("button", { name: "Voltar ao login" }));

    expect(navegar).toHaveBeenCalledWith({ to: "/entrar", search: { email: "ana@exemplo.com" } });
  });
});
