// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/ui";
import { ConvitePage } from "./ConvitePage";
import { guardarConvite, lerConviteGuardado } from "./conviteGuardado";
import type { TelaDoConvite } from "./telaDoConvite";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
vi.mock("@/lib/sessao", () => ({ sair: vi.fn() }));

function abrir(tela: TelaDoConvite, token = "tok-1") {
  render(
    <ToastProvider>
      <ConvitePage tela={tela} token={token} />
    </ToastProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => navegar.mockReset());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Convite de aluno válido (regras 46 e 48)", () => {
  const tela: TelaDoConvite = { tela: "valido", professor: "Carlos Almeida", email: null };

  it("mostra o professor e a validade de 7 dias", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Você foi convidado para treinar" })).toBeVisible();
    expect(
      screen.getByText(
        "O professor Carlos Almeida convidou você para o Coach In. Crie o seu acesso para ver os seus treinos e acompanhar a sua frequência.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Prof. Carlos Almeida")).toBeVisible();
    expect(screen.getByText("Convite válido por 7 dias")).toBeVisible();
  });

  it('"Criar meu acesso" guarda o convite e leva ao Criar acesso', async () => {
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Criar meu acesso" }));
    expect(lerConviteGuardado()).toBe("tok-1");
    expect(navegar).toHaveBeenCalledWith({ to: "/criar-conta", search: {} });
  });

  it("com e-mail no cadastro, o Criar acesso vem com ele preenchido (regra 46)", async () => {
    const usuario = abrir({ ...tela, email: "ana@exemplo.com" });
    await usuario.click(screen.getByRole("button", { name: "Criar meu acesso" }));
    expect(navegar).toHaveBeenCalledWith({
      to: "/criar-conta",
      search: { email: "ana@exemplo.com" },
    });
  });

  it('"Já tenho acesso? Entrar" guarda o convite e leva ao Login', async () => {
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Já tenho acesso? Entrar" }));
    expect(lerConviteGuardado()).toBe("tok-1");
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar", search: {} });
  });
});

describe("Você já tem uma conta (regra 79)", () => {
  it('"Entrar com minha conta" guarda o convite e leva ao Login com o e-mail', async () => {
    const usuario = abrir({
      tela: "ja_tem_conta",
      professor: "Carlos Almeida",
      email: "ana@exemplo.com",
    });
    expect(screen.getByRole("heading", { name: "Você já tem uma conta" })).toBeVisible();
    expect(
      screen.getByText(
        "O professor Carlos Almeida quer acompanhar seu treino. Entre com a sua conta para vincular.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Prof. Carlos Almeida")).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Entrar com minha conta" }));
    expect(lerConviteGuardado()).toBe("tok-1");
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar", search: { email: "ana@exemplo.com" } });
  });
});

describe("Convite que não vale mais", () => {
  it("expirado: texto com o professor, sem botão, e o convite guardado some (regras 48 e 132)", () => {
    guardarConvite("tok-1");
    abrir({ tela: "expirado", professor: "Carlos Almeida" });
    expect(screen.getByRole("heading", { name: "Este convite expirou" })).toBeVisible();
    expect(
      screen.getByText(
        "Os convites valem por 7 dias. Peça um novo convite ao professor Carlos Almeida.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(lerConviteGuardado()).toBeNull();
  });

  it('já usado: "Ir para o login" (regra 48)', async () => {
    guardarConvite("tok-1");
    const usuario = abrir({ tela: "usado" });
    expect(screen.getByRole("heading", { name: "Este convite já foi usado" })).toBeVisible();
    expect(
      screen.getByText(
        "Cada convite vale para um único acesso. Entre com o e-mail e a senha que você criou.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Ir para o login" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar" });
    expect(lerConviteGuardado()).toBeNull();
  });

  it("substituído: Este link não vale mais, sem botão (regra 82)", () => {
    guardarConvite("tok-1");
    abrir({ tela: "nao_vale_mais" });
    expect(screen.getByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(
      screen.getByText(
        "Ele foi substituído por um link mais novo. Confira o canal em que você fala com seu professor (WhatsApp, e-mail…) e use o link mais recente.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(lerConviteGuardado()).toBeNull();
  });
});

describe("Logado", () => {
  it("chegar ao convite já logado consome o convite guardado (sem voltar a ele a cada abertura)", () => {
    guardarConvite("tok-1");
    abrir({ tela: "vincular", professor: "Carlos Almeida" });
    expect(lerConviteGuardado()).toBeNull();
  });
});
