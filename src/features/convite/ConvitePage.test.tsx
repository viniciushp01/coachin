// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { ConvitePage } from "./ConvitePage";
import { guardarConvite, lerConviteGuardado } from "./conviteGuardado";
import type { TelaDoConvite } from "./telaDoConvite";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
const sair = vi.fn();
vi.mock("@/lib/sessao", () => ({
  sair: () => sair(),
  estadoSessaoQuery: { queryKey: ["sessao"] },
}));
const rpc = vi.fn();
vi.mock("@/lib/rpc", () => ({ rpc: (...args: unknown[]) => rpc(...args) }));

function abrir(tela: TelaDoConvite, token = "tok-1") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ConvitePage tela={tela} token={token} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  navegar.mockReset();
  sair.mockReset();
  rpc.mockReset();
});
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

describe("Vincular ao professor? (regras 79, 84, 97, 102 e 108)", () => {
  const tela: TelaDoConvite = {
    tela: "vincular",
    professor: "Carlos Almeida",
    email: "ana@exemplo.com",
  };

  it("mostra o professor, a conta em uso e o aviso de dados", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Vincular ao professor?" })).toBeVisible();
    expect(
      screen.getByText(
        "Com o vínculo, o professor Carlos Almeida monta os seus treinos e acompanha a sua frequência.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Prof. Carlos Almeida")).toBeVisible();
    expect(screen.getByText("Você está entrando como ana@exemplo.com.")).toBeVisible();
    expect(screen.getByText("O professor vê seus dados")).toBeVisible();
    expect(
      screen.getByText(
        "Nome, nascimento, telefone, altura, peso e restrições ou dores, para montar o treino e falar com você. Altura e peso podem ser compartilhados em qualquer idade; restrições ou dores são dados de saúde (LGPD).",
      ),
    ).toBeVisible();
  });

  it("chegar já logado consome o convite guardado", () => {
    guardarConvite("tok-1");
    abrir(tela);
    expect(lerConviteGuardado()).toBeNull();
  });

  it('"Vincular ao professor" aceita o convite e mostra "Conta vinculada"', async () => {
    rpc.mockResolvedValue({ needs_first_access: true });
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Vincular ao professor" }));
    expect(rpc).toHaveBeenCalledWith("accept_student_invite", { p_token: "tok-1" });
    expect(await screen.findByRole("heading", { name: "Conta vinculada" })).toBeVisible();
    expect(
      screen.getByText(
        "O professor Carlos Almeida agora monta os seus treinos. Eles aparecem no seu início.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Ir para o início" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it('"Conta vinculada" fica mesmo se o loader rodar de novo e o convite já vier usado', async () => {
    rpc.mockResolvedValue({ needs_first_access: true });
    const cliente = new QueryClient();
    const arvore = (t: TelaDoConvite) => (
      <QueryClientProvider client={cliente}>
        <ToastProvider>
          <ConvitePage tela={t} token="tok-1" />
        </ToastProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(arvore(tela));
    await userEvent.setup().click(screen.getByRole("button", { name: "Vincular ao professor" }));
    await screen.findByRole("heading", { name: "Conta vinculada" });
    rerender(arvore({ tela: "usado" }));
    expect(screen.getByRole("heading", { name: "Conta vinculada" })).toBeVisible();
  });

  it("convite que venceu enquanto a tela estava aberta: a tela do convite expirado", async () => {
    rpc.mockRejectedValue(new ErroApp("invite_expired"));
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Vincular ao professor" }));
    expect(await screen.findByRole("heading", { name: "Este convite expirou" })).toBeVisible();
  });

  it("convite substituído no meio do caminho: Este link não vale mais", async () => {
    rpc.mockRejectedValue(new ErroApp("invite_replaced"));
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Vincular ao professor" }));
    expect(await screen.findByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
  });

  it("outros erros viram toast e a tela fica (ex.: sem conexão)", async () => {
    rpc.mockRejectedValue(new ErroApp("sem_conexao"));
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Vincular ao professor" }));
    expect(await screen.findByText("Sem conexão. Tente de novo.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Vincular ao professor?" })).toBeVisible();
  });

  it('"Agora não" recusa o convite e volta para onde a pessoa estava (regra 102)', async () => {
    rpc.mockResolvedValue(null);
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Agora não" }));
    expect(rpc).toHaveBeenCalledWith("decline_invite", { p_token: "tok-1" });
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it('"Usar outra conta" sai deste aparelho e vai ao Login guardando o convite (regra 97)', async () => {
    sair.mockResolvedValue(undefined);
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Usar outra conta" }));
    expect(sair).toHaveBeenCalled();
    expect(lerConviteGuardado()).toBe("tok-1");
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar" });
  });
});

describe("Trocar de professor? (regras 98 e 102)", () => {
  const tela: TelaDoConvite = {
    tela: "trocar",
    professor: "Marina Souza",
    professorAtual: "Carlos Almeida",
  };

  it("mostra o professor atual, o novo e o aviso de dados substituídos", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Trocar de professor?" })).toBeVisible();
    expect(
      screen.getByText(
        "Você já treina com o Prof. Carlos Almeida. No app, cada aluno tem um professor por vez.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Novo professor")).toBeVisible();
    expect(screen.getByText("Prof. Marina Souza")).toBeVisible();
    expect(screen.getByText("Seus dados de treino serão substituídos")).toBeVisible();
    expect(
      screen.getByText(
        "Se você trocar, os dados de treino do Prof. Carlos Almeida são substituídos pelos do novo professor. Você não pode ter dois professores ao mesmo tempo.",
      ),
    ).toBeVisible();
  });

  it('"Continuar com meu professor" recusa o convite e volta ao início (regra 102)', async () => {
    rpc.mockResolvedValue(null);
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Continuar com meu professor" }));
    expect(rpc).toHaveBeenCalledWith("decline_invite", { p_token: "tok-1" });
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it('"Trocar de professor" confirma a troca e mostra "Professor trocado"', async () => {
    rpc.mockResolvedValue({ switched: true, needs_first_access: false });
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Trocar de professor" }));
    expect(rpc).toHaveBeenCalledWith("accept_student_invite", {
      p_token: "tok-1",
      p_confirm_switch: true,
    });
    expect(await screen.findByRole("heading", { name: "Professor trocado" })).toBeVisible();
    expect(
      screen.getByText(
        "Agora você treina com o Prof. Marina Souza. O seu treino aparece quando o professor montar.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Ir para o início" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("convite que venceu no meio do caminho: a tela do convite expirado", async () => {
    rpc.mockRejectedValue(new ErroApp("invite_expired"));
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Trocar de professor" }));
    expect(await screen.findByRole("heading", { name: "Este convite expirou" })).toBeVisible();
  });
});
