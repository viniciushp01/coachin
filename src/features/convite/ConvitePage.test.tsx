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
const ativarAcesso = vi.fn();
vi.mock("./ativarAcesso", () => ({
  ativarAcessoDeProfessor: (...args: unknown[]) => ativarAcesso(...args),
}));

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
  ativarAcesso.mockReset();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Convite de aluno válido (regras 46 e 48)", () => {
  const tela: TelaDoConvite = { tela: "valido", professor: "Carlos Almeida", email: null };

  it("mostra o professor e a validade de 7 dias", () => {
    abrir(tela);
    expect(
      screen.getByRole("heading", { name: "Você recebeu um convite para treinar" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "O professor Carlos Almeida convidou você para o Coach In. Crie o seu acesso para ver os seus treinos e acompanhar a sua frequência.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Carlos Almeida")).toBeVisible();
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
    expect(screen.getByText("Carlos Almeida")).toBeVisible();
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
    expect(screen.getByText("Carlos Almeida")).toBeVisible();
    expect(screen.getByText("Você entrou com ana@exemplo.com.")).toBeVisible();
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
        "Você já treina com Carlos Almeida. No app, cada aluno tem um professor por vez.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Novo professor")).toBeVisible();
    expect(screen.getByText("Marina Souza")).toBeVisible();
    expect(screen.getByText("Seus dados de treino serão substituídos")).toBeVisible();
    expect(
      screen.getByText(
        "Se você trocar, os dados de treino de Carlos Almeida são substituídos pelos do novo professor. Você não pode ter dois professores ao mesmo tempo.",
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
        "Agora você treina com Marina Souza. O seu treino aparece quando o professor montar.",
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

describe("Convite de professor · Você já tem uma conta (regra 93)", () => {
  const tela: TelaDoConvite = { tela: "professor_ja_tem_conta", email: "ana@exemplo.com" };

  it("pede o login com a conta do e-mail do convite", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Você já tem uma conta" })).toBeVisible();
    expect(
      screen.getByText("Entre com a conta deste e-mail para virar professor no Coach In."),
    ).toBeVisible();
  });

  it('"Entrar com minha conta" guarda o convite e leva ao Login com o e-mail', async () => {
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Entrar com minha conta" }));
    expect(lerConviteGuardado()).toBe("tok-1");
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar", search: { email: "ana@exemplo.com" } });
  });

  it("não apaga o convite guardado (ainda falta o login)", () => {
    guardarConvite("tok-1");
    abrir(tela);
    expect(lerConviteGuardado()).toBe("tok-1");
  });
});

describe("Ativar acesso de professor? (regras 93, 97 e 102)", () => {
  const tela: TelaDoConvite = { tela: "ativar_professor" };

  it("avisa que o acesso de aluno é encerrado e os dados ficam guardados, sem acesso", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Ativar acesso de professor?" })).toBeVisible();
    expect(
      screen.getByText(
        "Sua conta vai passar a ser de professor. Cada e-mail tem uma única função no Coach In.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Seu acesso de aluno será encerrado")).toBeVisible();
    expect(
      screen.getByText(
        "Seus dados de treino ficam guardados, sem acesso, e você deixa de aparecer na lista do seu professor atual.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Agora não" })).toBeVisible();
  });

  it("apaga o convite guardado: a pessoa já chegou nele", () => {
    guardarConvite("tok-1");
    abrir(tela);
    expect(lerConviteGuardado()).toBeNull();
  });

  it('"Ativar acesso de professor" converte a conta, relê a sessão e vai à lista de alunos', async () => {
    rpc.mockResolvedValue({ role: "professor" });
    const cliente = new QueryClient();
    cliente.setQueryData(["sessao"], { tipo: "logado", papel: "aluno" });
    render(
      <QueryClientProvider client={cliente}>
        <ToastProvider>
          <ConvitePage tela={tela} token="tok-1" />
        </ToastProvider>
      </QueryClientProvider>,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ativar acesso de professor" }));
    expect(rpc).toHaveBeenCalledWith("accept_teacher_invite", { p_token: "tok-1" });
    expect(navegar).toHaveBeenCalledWith({ to: "/professor", replace: true });
    expect(cliente.getQueryData(["sessao"])).toBeUndefined();
  });

  it('"Agora não" recusa o convite e volta para onde a pessoa estava (regra 102)', async () => {
    rpc.mockResolvedValue(null);
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Agora não" }));
    expect(rpc).toHaveBeenCalledWith("decline_invite", { p_token: "tok-1" });
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("convite que mudou no meio do caminho: Este link não vale mais (do professor)", async () => {
    rpc.mockImplementation(async () => {
      throw new ErroApp("invite_expired");
    });
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Ativar acesso de professor" }));
    expect(await screen.findByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(
      screen.getByText(
        "Ele expirou, já foi usado ou foi substituído por outro. Peça um novo link de ativação a quem administra o Coach In.",
      ),
    ).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('"Agora não" com convite que já não está pendente: Este link não vale mais', async () => {
    rpc.mockImplementation(async () => {
      throw new ErroApp("invite_not_pending");
    });
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Agora não" }));
    expect(await screen.findByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("outros erros viram toast e a tela fica (ex.: e-mail diferente)", async () => {
    rpc.mockImplementation(async () => {
      throw new ErroApp("email_mismatch");
    });
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Ativar acesso de professor" }));
    expect(await screen.findByText("Este convite foi enviado para outro e-mail.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ativar acesso de professor?" })).toBeVisible();
  });
});

describe("Este convite é para outra conta (regra 97)", () => {
  const tela: TelaDoConvite = { tela: "outra_conta", email: "vinicius@exemplo.com" };

  it("mostra a conta da sessão e explica que o convite é de outro e-mail", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Este convite é para outra conta" })).toBeVisible();
    expect(
      screen.getByText(
        "Você entrou com vinicius@exemplo.com, e este convite foi enviado para outro e-mail. Saia e entre com a conta do e-mail que recebeu o convite.",
      ),
    ).toBeVisible();
  });

  it('"Sair e entrar com outra conta" sai neste aparelho e vai ao Login guardando o convite', async () => {
    sair.mockResolvedValue(undefined);
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Sair e entrar com outra conta" }));
    expect(sair).toHaveBeenCalled();
    expect(lerConviteGuardado()).toBe("tok-1");
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar" });
  });

  it('"Agora não" volta para onde a pessoa estava, sem mexer no convite', async () => {
    const usuario = abrir(tela);
    await usuario.click(screen.getByRole("button", { name: "Agora não" }));
    expect(rpc).not.toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});

describe("Link de ativação que não vale mais (Figma Professor · Entrada, 5)", () => {
  it("vencido, usado ou substituído: pedir novo link a quem administra, sem botão", () => {
    guardarConvite("tok-1");
    abrir({ tela: "professor_nao_vale_mais" });
    expect(screen.getByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
    expect(
      screen.getByText(
        "Ele expirou, já foi usado ou foi substituído por outro. Peça um novo link de ativação a quem administra o Coach In.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(lerConviteGuardado()).toBeNull();
  });
});

describe("Ative seu acesso (regras 78 e 93; Figma Professor · Entrada, 1)", () => {
  const tela: TelaDoConvite = { tela: "ative_seu_acesso", email: "carlos@email.com" };

  async function ativarCom(senha: string) {
    const usuario = abrir(tela);
    await usuario.type(screen.getByLabelText("Senha"), senha);
    await usuario.click(screen.getByRole("button", { name: "Ativar acesso" }));
  }

  it("mostra o e-mail do convite sem edição, a senha com mostrar/ocultar e a dica", () => {
    abrir(tela);
    expect(screen.getByRole("heading", { name: "Ative seu acesso" })).toBeVisible();
    expect(
      screen.getByText(
        "Seu e-mail foi autorizado como professor no Coach In. Crie uma senha para entrar.",
      ),
    ).toBeVisible();
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveValue("carlos@email.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("placeholder", "Crie uma senha");
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeVisible();
    expect(screen.getByText("Mínimo de 8 caracteres, com letras e números.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ativar acesso" })).toBeVisible();
  });

  it("não apaga o convite guardado: a pessoa ainda não ativou", () => {
    guardarConvite("tok-1");
    abrir(tela);
    expect(lerConviteGuardado()).toBe("tok-1");
  });

  it("senha fraca: erro no campo, sem chamar o servidor (regra 78)", async () => {
    await ativarCom("abc");
    expect(
      await screen.findByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
    expect(ativarAcesso).not.toHaveBeenCalled();
  });

  it('ativa, mostra "Acesso ativado" e vai à lista de alunos com a sessão relida', async () => {
    ativarAcesso.mockResolvedValue(undefined);
    const cliente = new QueryClient();
    cliente.setQueryData(["sessao"], { tipo: "anonimo" });
    render(
      <QueryClientProvider client={cliente}>
        <ToastProvider>
          <ConvitePage tela={tela} token="tok-1" />
        </ToastProvider>
      </QueryClientProvider>,
    );
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Senha"), "senha123");
    await usuario.click(screen.getByRole("button", { name: "Ativar acesso" }));
    expect(ativarAcesso).toHaveBeenCalledWith("tok-1", "carlos@email.com", "senha123");
    expect(await screen.findByRole("heading", { name: "Acesso ativado" })).toBeVisible();
    expect(
      screen.getByText(
        "Nas próximas vezes, entre com seu e-mail e senha. Você vai direto para a lista de alunos.",
      ),
    ).toBeVisible();
    expect(cliente.getQueryData(["sessao"])).toBeUndefined();
    await usuario.click(screen.getByRole("button", { name: "Ir para a lista de alunos" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor", replace: true });
  });

  it("e-mail que ganhou conta no caminho: Você já tem uma conta", async () => {
    ativarAcesso.mockImplementation(async () => {
      throw new ErroApp("email_has_account");
    });
    await ativarCom("senha123");
    expect(await screen.findByRole("heading", { name: "Você já tem uma conta" })).toBeVisible();
  });

  it("convite que mudou no caminho: Este link não vale mais", async () => {
    ativarAcesso.mockImplementation(async () => {
      throw new ErroApp("invite_used");
    });
    await ativarCom("senha123");
    expect(await screen.findByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
  });

  it("senha recusada pelo servidor: erro no campo", async () => {
    ativarAcesso.mockImplementation(async () => {
      throw new ErroApp("weak_password");
    });
    await ativarCom("senha123");
    expect(
      await screen.findByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ative seu acesso" })).toBeVisible();
  });

  it("outros erros viram toast e a tela fica", async () => {
    ativarAcesso.mockImplementation(async () => {
      throw new ErroApp("sem_conexao");
    });
    await ativarCom("senha123");
    expect(await screen.findByText("Sem conexão. Tente de novo.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ative seu acesso" })).toBeVisible();
  });
});
