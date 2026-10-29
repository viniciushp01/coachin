// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { ProfessorComConvitePage, type ProfessorComConvite } from "./ProfessorComConvitePage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));
const rpc = vi.fn();
vi.mock("@/lib/rpc", () => ({ rpc: (...args: unknown[]) => rpc(...args) }));

const agora = new Date("2026-10-29T12:00:00Z");
const pendente: ProfessorComConvite = {
  professor: { nome: "Fernanda Lopes", email: "fernanda@exemplo.com" },
  convite: {
    id: "i1",
    status: "pending",
    expires_at: "2026-10-30T12:00:00Z",
    created_at: "2026-10-29T08:00:00Z",
    declined_at: null,
  },
};
const novoLink = { invite_id: "i2", token: "tok-novo", expires_at: "2026-10-30T12:00:00Z" };

function abrir(dados: ProfessorComConvite = pendente) {
  render(
    <ToastProvider>
      <ProfessorComConvitePage {...dados} agora={agora} />
    </ToastProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  navegar.mockReset();
  rpc.mockReset();
});
afterEach(cleanup);

describe("Convite de professor pendente (regras 92, 93 e 142)", () => {
  it("mostra o nome, o chip, o e-mail e a validade, sem Copiar link", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Fernanda Lopes" })).toBeVisible();
    expect(screen.getByText("Convite pendente")).toBeVisible();
    expect(screen.getByText("fernanda@exemplo.com")).toBeVisible();
    expect(screen.getByText("Convite válido até 30/10")).toBeVisible();
    expect(screen.getByText("Enviado em 29/10. A pessoa ainda não ativou o acesso.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Copiar link" })).toBeNull();
    expect(
      screen.getByText(
        "O link só aparece quando é gerado: para pegar outro, toque em Reenviar convite (o anterior deixa de valer).",
      ),
    ).toBeVisible();
  });

  it('"Reenviar convite" gera o link novo de 1 dia, com o toast', async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Reenviar convite" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", { p_invite_id: "i1" });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
    expect(screen.getByText(/vale por 1 dia/)).toBeVisible();
    expect(screen.getByText("Convite reenviado.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeVisible();
  });

  it("voltar leva à lista de professores", async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/admin" });
  });

  it("Corrigir e-mail reenvia para o e-mail novo", async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Corrigir e-mail" }));
    expect(
      screen.getByText("O novo link vale por 1 dia. Confira o e-mail antes de reenviar."),
    ).toBeVisible();
    const campo = screen.getByLabelText("E-mail do convite");
    await usuario.clear(campo);
    await usuario.type(campo, "fernanda@exemplo.com.br");
    await usuario.click(screen.getByRole("button", { name: "Corrigir e reenviar" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", {
      p_invite_id: "i1",
      p_new_email: "fernanda@exemplo.com.br",
    });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
  });

  it("e-mail de quem já é professor: erro no campo", async () => {
    rpc.mockImplementation(() => Promise.reject(new ErroApp("already_teacher")));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Corrigir e-mail" }));
    const campo = screen.getByLabelText("E-mail do convite");
    await usuario.clear(campo);
    await usuario.type(campo, "carlos@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Corrigir e reenviar" }));
    expect(await screen.findByText("Este e-mail já é de um professor.")).toBeVisible();
  });

  it("convite já usado: toast e volta à lista", async () => {
    rpc.mockImplementation(() => Promise.reject(new ErroApp("invite_used")));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Reenviar convite" }));
    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/admin" }));
  });
});

describe("Convite de professor expirado", () => {
  const expirado: ProfessorComConvite = {
    professor: { nome: "Ricardo Souza", email: "ricardo@exemplo.com" },
    convite: { ...pendente.convite, id: "i3", expires_at: "2026-10-25T12:00:00Z" },
  };

  it("mostra quando expirou, sem pronome, e gera um novo", async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir(expirado);
    expect(screen.getByText("Convite expirado")).toBeVisible();
    expect(screen.getByText("Este convite expirou em 25/10")).toBeVisible();
    expect(
      screen.getByText(
        "O link antigo não funciona mais. Gere um novo convite para Ricardo Souza ativar o acesso.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Gerar novo convite" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", { p_invite_id: "i3" });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
    expect(screen.queryByText("Convite reenviado.")).toBeNull();
  });
});

describe("Convite de professor recusado (regra 102)", () => {
  const recusado: ProfessorComConvite = {
    professor: { nome: "Ricardo Souza", email: "ricardo@exemplo.com" },
    convite: { ...pendente.convite, status: "declined", declined_at: "2026-10-27T15:00:00Z" },
  };

  it("mostra a data da recusa e envia um novo", async () => {
    rpc.mockResolvedValue(novoLink);
    const usuario = abrir(recusado);
    expect(screen.getByText("Convite recusado")).toBeVisible();
    expect(screen.getByText("Recusou o convite em 27/10")).toBeVisible();
    expect(
      screen.getByText(
        "Ricardo Souza escolheu não ativar o acesso agora e o link foi encerrado. Envie outro convite se quiser tentar de novo.",
      ),
    ).toBeVisible();
    await usuario.click(screen.getByRole("button", { name: "Enviar novo convite" }));
    expect(rpc).toHaveBeenCalledWith("reissue_invite", { p_invite_id: "i1" });
    expect(await screen.findByRole("heading", { name: "Convite gerado" })).toBeVisible();
  });
});
