// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { ConvitePendentePage } from "./ConvitePendentePage";
import { lerConvitePendente } from "./convitePendente";
import { lerConviteGuardado } from "./conviteGuardado";

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

const cliente = new QueryClient();
function abrir() {
  render(
    <QueryClientProvider client={cliente}>
      <ToastProvider>
        <ConvitePendentePage
          convite={{ id: "inv-1", professor: "Carlos Almeida" }}
          email="ana@exemplo.com"
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
const vincular = () => screen.getByRole("button", { name: "Vincular ao professor" });
const agoraNao = () => screen.getByRole("button", { name: "Agora não" });
const semProfessor = () =>
  screen.findByRole("heading", { name: "Você ainda não tem um professor" });

beforeEach(() => {
  navegar.mockReset();
  sair.mockReset();
  rpc.mockReset().mockResolvedValue(null);
  cliente.setQueryData(["sessao"], { tipo: "logado" });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Convite pendente do e-mail da conta (regra 173)", () => {
  it("oferece o vínculo com o professor, a conta e o aviso de dados, sem vincular sozinho", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Vincular ao professor?" })).toBeVisible();
    expect(screen.getByText("Carlos Almeida")).toBeVisible();
    expect(screen.getByText("Você entrou com ana@exemplo.com.")).toBeVisible();
    expect(screen.getByText("O professor vê seus dados")).toBeVisible();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('"Vincular ao professor" aceita pelo id, relê a sessão e mostra "Conta vinculada"', async () => {
    const usuario = abrir();
    await usuario.click(vincular());
    expect(rpc).toHaveBeenCalledWith("accept_my_student_invite", { p_invite_id: "inv-1" });
    expect(await screen.findByRole("heading", { name: "Conta vinculada" })).toBeVisible();
    expect(cliente.getQueryData(["sessao"])).toBeUndefined();
    await usuario.click(screen.getByRole("button", { name: "Ir para o início" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("tela desmontada com o aceite em voo: o destino é lido de novo", async () => {
    let responder: (v: null) => void = () => undefined;
    rpc.mockReturnValue(new Promise<null>((r) => (responder = r)));
    const usuario = abrir();
    await usuario.click(vincular());
    cleanup();
    responder(null);
    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true }));
    expect(cliente.getQueryData(["sessao"])).toBeUndefined();
  });

  it('"Agora não" recusa pelo id e volta a "Você ainda não tem um professor" (regra 102)', async () => {
    const usuario = abrir();
    await usuario.click(agoraNao());
    expect(rpc).toHaveBeenCalledWith("decline_my_student_invite", { p_invite_id: "inv-1" });
    expect(await semProfessor()).toBeVisible();
  });

  it('"Usar outra conta" sai só neste aparelho e vai ao Login, sem guardar convite', async () => {
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Usar outra conta" }));
    expect(sair).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar" });
    expect(lerConviteGuardado()).toBeNull();
  });

  it.each(["sem_conexao", "teacher_unavailable"] as const)(
    "%s: toast, e a tela fica para tentar de novo",
    async (codigo) => {
      rpc.mockRejectedValue(new ErroApp(codigo));
      const usuario = abrir();
      await usuario.click(vincular());
      expect(await screen.findByText(new ErroApp(codigo).message)).toBeVisible();
      expect(vincular()).toBeEnabled();
    },
  );

  it.each(["invite_replaced", "invite_expired", "invite_used", "already_linked"] as const)(
    "ao vincular, %s: toast e o destino é lido de novo",
    async (codigo) => {
      rpc.mockRejectedValue(new ErroApp(codigo));
      const usuario = abrir();
      await usuario.click(vincular());
      expect(await screen.findByText(new ErroApp(codigo).message)).toBeVisible();
      expect(await semProfessor()).toBeVisible();
      expect(cliente.getQueryData(["sessao"])).toBeUndefined();
      expect(navegar).toHaveBeenCalledWith({ to: "/", replace: true });
    },
  );

  it("ao recusar um convite que já mudou: toast e volta a sem professor", async () => {
    rpc.mockRejectedValue(new ErroApp("invite_not_pending"));
    const usuario = abrir();
    await usuario.click(agoraNao());
    expect(await semProfessor()).toBeVisible();
  });
});

describe("lerConvitePendente", () => {
  it("devolve o convite válido", async () => {
    rpc.mockResolvedValue({ invite_id: "inv-1", inviter_name: "Carlos", state: "valid" });
    expect(await lerConvitePendente()).toEqual({ id: "inv-1", professor: "Carlos" });
    expect(rpc).toHaveBeenCalledWith("my_pending_student_invite");
  });

  it.each([
    ["sem convite", null],
    [
      "professor bloqueado (regra 133)",
      { invite_id: "inv-1", inviter_name: "Carlos", state: "teacher_unavailable" },
    ],
    ["resposta estranha", { state: "valid" }],
  ])("%s: /sem-professor fica como hoje", async (_caso, resposta) => {
    rpc.mockResolvedValue(resposta);
    expect(await lerConvitePendente()).toBeNull();
  });

  it("falha ao ler (ex.: sem conexão): /sem-professor fica como hoje", async () => {
    rpc.mockRejectedValue(new ErroApp("sem_conexao"));
    expect(await lerConvitePendente()).toBeNull();
  });
});
