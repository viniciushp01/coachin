// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { AlunoComConvitePage } from "./AlunoComConvitePage";
import type { AlunoComConvite } from "./conviteDoAluno";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
const rpc = vi.fn();
vi.mock("@/lib/rpc", () => ({ rpc: (...args: unknown[]) => rpc(...args) }));

const agora = new Date("2026-10-29T12:00:00Z");
const pendente: AlunoComConvite = {
  aluno: { id: "s1", nome: "Rafael Torres", email: "rafael@exemplo.com" },
  convite: {
    id: "i1",
    status: "pending",
    expires_at: "2026-11-03T12:00:00Z",
    created_at: "2026-10-27T12:00:00Z",
    declined_at: null,
  },
};
const novoLink = { invite_id: "i2", token: "tok-novo", expires_at: "2026-11-05T12:00:00Z" };

function abrir(dados: AlunoComConvite = pendente) {
  render(
    <ToastProvider>
      <AlunoComConvitePage {...dados} agora={agora} />
    </ToastProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  navegar.mockReset();
  rpc.mockReset();
});
afterEach(cleanup);

describe("Convite pendente (regras 55 e 58)", () => {
  it("mostra o aluno, o chip, o e-mail e a validade", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Rafael Torres" })).toBeVisible();
    expect(screen.getByText("Convite pendente")).toBeVisible();
    expect(screen.getByText("rafael@exemplo.com")).toBeVisible();
    expect(screen.getByText("Convite válido até 03/11")).toBeVisible();
    expect(screen.getByText("Enviado em 27/10. O aluno ainda não criou o acesso.")).toBeVisible();
  });

  it('"Reenviar convite" gera um link novo e mostra "Convite gerado" com o toast', async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Reenviar convite" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", { p_invite_id: "i1" });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
    expect(screen.getByText("Convite reenviado.")).toBeVisible();
  });

  it("sem e-mail no cadastro: o texto diz isso e não há Corrigir e-mail", () => {
    abrir({ ...pendente, aluno: { ...pendente.aluno, email: null } });
    expect(screen.getByText("Sem e-mail no cadastro")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Corrigir e-mail" })).toBeNull();
  });

  it("voltar leva à área do professor", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/professor" });
  });
});

describe("Corrigir e-mail (regra 58)", () => {
  it("edita o e-mail e reenvia com o link novo", async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Corrigir e-mail" }));
    const campo = screen.getByLabelText("E-mail do convite");
    expect(campo).toHaveValue("rafael@exemplo.com");
    expect(screen.getByText("O link anterior deixa de valer")).toBeVisible();
    expect(
      screen.getByText("O novo link vale por 7 dias. Confira o e-mail antes de reenviar."),
    ).toBeVisible();
    await usuario.clear(campo);
    await usuario.type(campo, "rafael@exemplo.com.br");
    await usuario.click(screen.getByRole("button", { name: "Corrigir e reenviar" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", {
      p_invite_id: "i1",
      p_new_email: "rafael@exemplo.com.br",
    });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
  });

  it("voltar sai da correção sem reenviar", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Corrigir e-mail" }));
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "Reenviar convite" })).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("e-mail inválido ou já usado por outro aluno: erro no campo", async () => {
    rpc.mockRejectedValue(new ErroApp("student_email_taken"));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Corrigir e-mail" }));
    const campo = screen.getByLabelText("E-mail do convite");
    await usuario.clear(campo);
    await usuario.type(campo, "rafael@");
    await usuario.click(screen.getByRole("button", { name: "Corrigir e reenviar" }));
    expect(
      await screen.findByText("Digite um e-mail válido, como nome@exemplo.com."),
    ).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
    await usuario.clear(campo);
    await usuario.type(campo, "ana@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Corrigir e reenviar" }));
    expect(await screen.findByText("Você já tem um aluno com este e-mail.")).toBeVisible();
  });
});

describe("Convite expirado (regra 58)", () => {
  const expirado: AlunoComConvite = {
    aluno: { id: "s2", nome: "Beatriz Nunes", email: null },
    convite: { ...pendente.convite, id: "i3", expires_at: "2026-10-24T12:00:00Z" },
  };

  it("mostra quando expirou e gera um novo", async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir(expirado);
    expect(screen.getByText("Convite expirado")).toBeVisible();
    expect(screen.getByText("Este convite expirou em 24/10")).toBeVisible();
    expect(
      screen.getByText("O link antigo não funciona mais. Gere um novo para ele criar o acesso."),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Gerar novo convite" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", { p_invite_id: "i3" });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
  });
});

describe("Convite recusado (regra 102)", () => {
  const recusado: AlunoComConvite = {
    ...pendente,
    convite: { ...pendente.convite, status: "declined", declined_at: "2026-10-27T15:00:00Z" },
  };

  it("mostra a data da recusa e envia um novo", async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir(recusado);
    expect(screen.getByText("Convite recusado")).toBeVisible();
    expect(screen.getByText("Recusou o convite em 27/10")).toBeVisible();
    expect(
      screen.getByText(
        "Ele escolheu não vincular a conta agora e o link foi encerrado. Envie outro convite se quiser tentar de novo.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Enviar novo convite" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", { p_invite_id: "i1" });
  });
});

describe("Erros ao reenviar", () => {
  it("aluno que já ativou o acesso: toast e volta à área", async () => {
    rpc.mockRejectedValue(new ErroApp("student_already_linked"));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Reenviar convite" }));
    expect(await screen.findByText("Este aluno já ativou o acesso.")).toBeVisible();
    expect(navegar).toHaveBeenCalledWith({ to: "/professor" });
  });

  it("sem conexão: toast e a tela fica", async () => {
    rpc.mockRejectedValue(new ErroApp("sem_conexao"));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Reenviar convite" }));
    expect(await screen.findByText("Sem conexão. Tente de novo.")).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reenviar convite" })).toBeEnabled();
  });
});

describe("Recusa sem data registrada", () => {
  it("diz só que recusou, sem inventar a data", () => {
    abrir({ ...pendente, convite: { ...pendente.convite, status: "declined", declined_at: null } });
    expect(screen.getByText("Recusou o convite")).toBeVisible();
  });
});
