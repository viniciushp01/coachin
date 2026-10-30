// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { ConviteGerado } from "./ConviteGerado";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));
const chamarFuncao = vi.fn();
vi.mock("@/lib/funcoes", () => ({
  chamarFuncao: (...args: unknown[]) => chamarFuncao(...args),
}));

const link = { nome: "Rafael Torres", comEmail: true, token: "tok-123" };

function abrir(props: Partial<Parameters<typeof ConviteGerado>[0]> = {}) {
  render(
    <ToastProvider>
      <ConviteGerado {...link} {...props} />
    </ToastProvider>,
  );
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

const enviar = () => screen.getByRole("button", { name: /Enviar por e-mail|Reenviar em/ });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  chamarFuncao.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Enviar por e-mail (regras 57, 136 e 139)", () => {
  it('com e-mail: "Enviar por e-mail" é o principal, com "Copiar link" ao lado', () => {
    abrir();
    expect(
      screen.getByText(
        "O link de Rafael Torres é de uso único e vale por 7 dias. Envie agora para Rafael criar o acesso.",
      ),
    ).toBeVisible();
    const botoes = screen.getAllByRole("button").map((b) => b.textContent);
    expect(botoes.slice(-2)).toEqual(["Enviar por e-mail", "Copiar link"]);
  });

  it("sem e-mail: não oferece o envio", () => {
    abrir({ comEmail: false });
    expect(screen.queryByRole("button", { name: "Enviar por e-mail" })).toBeNull();
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeVisible();
  });

  it("envia só o token; toast de sucesso e 60 s de espera com contagem", async () => {
    chamarFuncao.mockResolvedValue({ ok: true });
    const usuario = abrir();
    await usuario.click(enviar());
    expect(chamarFuncao).toHaveBeenCalledWith("enviar-convite", { token: "tok-123" });
    expect(await screen.findByText("Convite enviado por e-mail.")).toBeVisible();
    expect(enviar()).toHaveTextContent("Reenviar em 60 s");
    expect(enviar()).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(enviar()).toHaveTextContent("Reenviar em 45 s");
    await act(() => vi.advanceTimersByTimeAsync(45_000));
    expect(enviar()).toHaveTextContent("Enviar por e-mail");
    expect(enviar()).toBeEnabled();
  });

  it("falha do envio: toast da regra 136, o link segue copiável e a espera vale", async () => {
    chamarFuncao.mockImplementation(() => Promise.reject(new ErroApp("email_send_failed")));
    const usuario = abrir();
    await usuario.click(enviar());
    expect(
      await screen.findByText(
        "Não foi possível enviar o e-mail. Copie o link e envie por outro app.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeEnabled();
    expect(enviar()).toHaveTextContent("Reenviar em 60 s");
  });

  it('servidor recusa por intervalo: toast "Muitos envios. Espere um pouco." e o botão segue', async () => {
    chamarFuncao.mockImplementation(() => Promise.reject(new ErroApp("too_many_emails")));
    const usuario = abrir();
    await usuario.click(enviar());
    expect(await screen.findByText("Muitos envios. Espere um pouco.")).toBeVisible();
    expect(enviar()).toHaveTextContent("Enviar por e-mail");
  });

  it("enviarAoAbrir: o reenvio já envia ao abrir, uma vez só", async () => {
    chamarFuncao.mockResolvedValue({ ok: true });
    abrir({ enviarAoAbrir: true });
    expect(await screen.findByText("Convite enviado por e-mail.")).toBeVisible();
    expect(chamarFuncao).toHaveBeenCalledTimes(1);
    expect(enviar()).toBeDisabled();
  });
});
