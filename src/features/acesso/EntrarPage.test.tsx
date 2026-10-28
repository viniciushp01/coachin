// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lerUltimoUso } from "@/lib/inatividade";
import { ToastProvider } from "@/ui";
import { EntrarPage } from "./EntrarPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: (...args: unknown[]) => signInWithPassword(...args) } },
}));

function abrirTela(props: Parameters<typeof EntrarPage>[0] = {}) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["sessao"], { tipo: "anonimo" });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EntrarPage {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { usuario: userEvent.setup(), queryClient };
}

async function preencherEEntrar(
  usuario: ReturnType<typeof userEvent.setup>,
  email: string,
  senha: string,
) {
  if (email) await usuario.type(screen.getByLabelText("E-mail"), email);
  if (senha) await usuario.type(screen.getByLabelText("Senha"), senha);
  await usuario.click(screen.getByRole("button", { name: "Entrar" }));
}

beforeEach(() => {
  navegar.mockReset();
  signInWithPassword.mockReset();
});
afterEach(cleanup);

describe("Entrar", () => {
  it("entra com e-mail e senha e segue para o destino da conta", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const { usuario, queryClient } = abrirTela();

    await preencherEEntrar(usuario, " ana@exemplo.com ", "abc12345");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "ana@exemplo.com",
      password: "abc12345",
    });
    expect(queryClient.getQueryData(["sessao"])).toBeUndefined();
    // Entrar conta como uso (regra 121): a sessão nova não vence pelo uso antigo.
    expect(Date.now() - (lerUltimoUso() ?? 0)).toBeLessThan(5000);
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("e-mail ou senha errados: toast neutro e campos continuam preenchidos (regra 51)", async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
    });
    const { usuario } = abrirTela();

    await preencherEEntrar(usuario, "ana@exemplo.com", "senhaerrada1");

    expect(await screen.findByText("E-mail ou senha não conferem.")).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com");
    expect(screen.getByLabelText("Senha")).toHaveValue("senhaerrada1");
    expect(navegar).not.toHaveBeenCalled();
  });

  it("pode tentar de novo depois de errar, sem bloqueio (regra 51)", async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials", status: 400 },
    });
    const { usuario } = abrirTela();

    await preencherEEntrar(usuario, "ana@exemplo.com", "errada1");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    expect(signInWithPassword).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("sem internet: avisa a falta de conexão, nunca senha errada", async () => {
    signInWithPassword.mockRejectedValue(new TypeError("Failed to fetch"));
    const { usuario } = abrirTela();

    await preencherEEntrar(usuario, "ana@exemplo.com", "abc12345");

    expect(await screen.findByText("Sem conexão. Tente de novo.")).toBeVisible();
    expect(screen.queryByText("E-mail ou senha não conferem.")).not.toBeInTheDocument();
  });

  it("e-mail mal formado ou senha vazia: erro no campo, sem chamar o Supabase", async () => {
    const { usuario } = abrirTela();

    await preencherEEntrar(usuario, "ana@", "");

    expect(
      await screen.findByText("Digite um e-mail válido, como nome@exemplo.com."),
    ).toBeVisible();
    expect(screen.getByText("Digite sua senha.")).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('sessão vencida por inatividade: título "Entre de novo" (regra 121)', () => {
    abrirTela({ sessaoExpirada: true });
    expect(screen.getByRole("heading", { name: "Entre de novo" })).toBeVisible();
    expect(
      screen.getByText("Sua sessão expirou por inatividade. Use o e-mail e a senha do seu acesso."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  it('sem sessão vencida, o título é "Entrar"', () => {
    abrirTela();
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  it("abre com o e-mail preenchido quando vem de outra tela (regra 83)", () => {
    abrirTela({ emailInicial: "ana@exemplo.com" });
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com");
  });

  it('"Não tem conta? Criar conta" leva a Criar acesso (regra 89)', async () => {
    const { usuario } = abrirTela();
    await usuario.click(screen.getByRole("button", { name: "Não tem conta? Criar conta" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/criar-conta" });
  });
});
