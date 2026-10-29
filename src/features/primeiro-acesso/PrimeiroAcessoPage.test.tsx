// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VinculoAtivo } from "@/lib/vinculo";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { PrimeiroAcessoPage } from "./PrimeiroAcessoPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
vi.mock("@/lib/sessao", () => ({ estadoSessaoQuery: { queryKey: ["sessao"] } }));
const rpc = vi.fn();
vi.mock("@/lib/rpc", () => ({ rpc: (...args: unknown[]) => rpc(...args) }));

const vinculo: VinculoAtivo = {
  nome: "Ana Souza",
  telefone: "+5531987654321",
  professor: "Carlos Almeida",
};

function abrir(avisoAceito = false, v = vinculo) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <PrimeiroAcessoPage vinculo={v} avisoAceito={avisoAceito} hoje="2026-10-29" />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const continuar = () => screen.getByRole("button", { name: "Continuar" });
const caixa = () =>
  screen.getByRole("checkbox", {
    name: "Li e entendi que o professor acessa esses dados para montar o meu treino.",
  });

beforeEach(() => {
  navegar.mockReset();
  rpc.mockReset();
});
afterEach(cleanup);

describe("Passo 1 · Antes de começar (regras 49, 84 e 108)", () => {
  it("mostra o aviso com o nome do professor e o passo 1 de 2", () => {
    abrir();
    expect(screen.getByRole("progressbar", { name: "Passo 1 de 2" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Antes de começar" })).toBeVisible();
    expect(screen.getByText("Seu professor vê estes dados")).toBeVisible();
    expect(
      screen.getByText(
        "Carlos Almeida vê seu nome, nascimento, telefone, altura, peso e restrições ou dores para montar o seu treino e falar com você. Altura e peso podem ser compartilhados em qualquer idade, mas é importante saber que o professor os vê. Restrições ou dores são dados de saúde e recebem cuidado especial, conforme a LGPD.",
      ),
    ).toBeVisible();
  });

  it('"Continuar" só habilita depois de marcar a caixa', async () => {
    const usuario = abrir();
    expect(continuar()).toBeDisabled();
    await usuario.click(caixa());
    expect(continuar()).toBeEnabled();
  });

  it("Continuar grava o aceite e vai para o passo 2", async () => {
    rpc.mockResolvedValue(undefined);
    const usuario = abrir();
    await usuario.click(caixa());
    await usuario.click(continuar());
    expect(rpc).toHaveBeenCalledWith("accept_data_notice");
    expect(await screen.findByRole("heading", { name: "Seu perfil" })).toBeVisible();
  });

  it("sem conexão, fica no passo 1 com o toast", async () => {
    rpc.mockRejectedValue(new ErroApp("sem_conexao"));
    const usuario = abrir();
    await usuario.click(caixa());
    await usuario.click(continuar());
    expect(await screen.findByText("Sem conexão. Tente de novo.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Antes de começar" })).toBeVisible();
  });
});

describe("Retomar (regras 86 e 99)", () => {
  it("com o aviso já aceito, abre no passo 2", () => {
    abrir(true);
    expect(screen.getByRole("heading", { name: "Seu perfil" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Passo 2 de 2" })).toBeVisible();
  });

  it("voltar ao passo 1 mostra a caixa marcada, e Continuar não grava de novo", async () => {
    const usuario = abrir(true);
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(caixa()).toBeChecked();
    await usuario.click(continuar());
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Seu perfil" })).toBeVisible();
  });
});

describe("Voltar e seguir de novo", () => {
  it("voltar ao passo 1 não apaga o que foi digitado no passo 2", async () => {
    const usuario = abrir(true);
    await usuario.type(screen.getByLabelText("Altura"), "1,65");
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    await usuario.click(continuar());
    expect(screen.getByLabelText("Altura")).toHaveValue("1,65");
  });
});

describe("Passo 2 · Seu perfil (regras 49, 85, 108 e 109)", () => {
  it("nome e telefone vêm do cadastro, editáveis", () => {
    abrir(true);
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Souza");
    expect(screen.getByLabelText("Telefone (WhatsApp)")).toHaveValue("(31) 98765-4321");
    expect(screen.getByLabelText("Código do país")).toHaveValue("+55");
    expect(
      screen.getByText("Preencha com calma. Você pode editar esses dados quando quiser."),
    ).toBeVisible();
  });

  it("a data de nascimento ganha as barras enquanto a pessoa digita (regra 141)", async () => {
    const usuario = abrir(true);
    await usuario.type(screen.getByLabelText("Data de nascimento"), "15031995");
    expect(screen.getByLabelText("Data de nascimento")).toHaveValue("15/03/1995");
  });

  it("sem telefone no cadastro, o campo vem vazio com +55", () => {
    abrir(true, { ...vinculo, telefone: null });
    expect(screen.getByLabelText("Telefone (WhatsApp)")).toHaveValue("");
  });

  it("Concluir com tudo certo grava o perfil e vai para o início", async () => {
    rpc.mockResolvedValue(undefined);
    const usuario = abrir(true);
    await usuario.type(screen.getByLabelText("Data de nascimento"), "15/03/1995");
    await usuario.type(screen.getByLabelText("Altura"), "1,65");
    await usuario.type(screen.getByLabelText("Peso"), "60");
    await usuario.type(screen.getByLabelText("Restrições ou dores (opcional)"), "Dor no ombro");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    expect(rpc).toHaveBeenCalledWith("save_student_profile", {
      p_full_name: "Ana Souza",
      p_birth_date: "1995-03-15",
      p_phone: "+5531987654321",
      p_height_m: 1.65,
      p_weight_kg: 60,
      p_restrictions: "Dor no ombro",
    });
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("mostra os erros de campo da regra 85 e não grava", async () => {
    const usuario = abrir(true, { ...vinculo, telefone: null });
    await usuario.clear(screen.getByLabelText("Nome"));
    await usuario.type(screen.getByLabelText("Data de nascimento"), "15/03/2031");
    await usuario.type(screen.getByLabelText("Telefone (WhatsApp)"), "3198765");
    await usuario.type(screen.getByLabelText("Altura"), "3,80");
    await usuario.type(screen.getByLabelText("Peso"), "5");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByText("Digite seu nome.")).toBeVisible();
    expect(screen.getByText("Essa data ainda não chegou. Confira o nascimento.")).toBeVisible();
    expect(screen.getByText("Digite um telefone com DDD, como (31) 91234-5678.")).toBeVisible();
    expect(screen.getByText("Digite uma altura entre 1,00 m e 2,50 m.")).toBeVisible();
    expect(screen.getByText("Digite um peso entre 20 kg e 300 kg.")).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("erro de campo vindo do servidor aparece no campo", async () => {
    rpc.mockRejectedValue(new ErroApp("phone_invalid"));
    const usuario = abrir(true);
    await usuario.type(screen.getByLabelText("Data de nascimento"), "15/03/1995");
    await usuario.type(screen.getByLabelText("Altura"), "1,65");
    await usuario.type(screen.getByLabelText("Peso"), "60");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    expect(
      await screen.findByText("Digite um telefone com DDD, como (31) 91234-5678."),
    ).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });
});
