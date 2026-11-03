// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BloqueadoPage } from "./BloqueadoPage";
import { FolhaSair } from "./FolhaSair";
import { SemProfessorPage } from "./SemProfessorPage";

const signOut = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signOut: (...args: unknown[]) => signOut(...args) } },
}));

// O jsdom ainda não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

beforeEach(() => {
  signOut.mockReset().mockResolvedValue({ error: null });
  localStorage.clear();
});
afterEach(cleanup);

describe('"Sair" direto, sem folha (regra 129)', () => {
  it.each([
    ["Você ainda não tem um professor", () => <SemProfessorPage />],
    ["Seu acesso está bloqueado", () => <BloqueadoPage papel="professor" />],
    ["Sua conta está bloqueada", () => <BloqueadoPage papel="aluno" />],
  ])("%s: sai só deste aparelho, sem perguntar", async (_titulo, tela) => {
    const usuario = userEvent.setup();
    render(tela());

    await usuario.click(screen.getByRole("button", { name: "Sair" }));

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe('folha "Sair do app?" (regra 121)', () => {
  function abrirFolha() {
    const aoFechar = vi.fn();
    render(<FolhaSair aberta aoFechar={aoFechar} />);
    return { usuario: userEvent.setup(), aoFechar };
  }

  it("mostra o aviso de que os registros ficam no aparelho", () => {
    abrirFolha();
    const folha = screen.getByRole("dialog", { name: "Sair do app?" });
    expect(folha).toHaveTextContent(
      "Você vai precisar entrar de novo com e-mail e senha. Registros que ainda aguardam envio ficam guardados neste aparelho.",
    );
  });

  it('"Continuar no app" fecha a folha sem sair', async () => {
    const { usuario, aoFechar } = abrirFolha();

    await usuario.click(screen.getByRole("button", { name: "Continuar no app" }));

    expect(aoFechar).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('"Sair" encerra a sessão só deste aparelho e não apaga o que está guardado nele', async () => {
    localStorage.setItem("coachin:fila", "registro pendente");
    const { usuario } = abrirFolha();

    await usuario.click(screen.getByRole("button", { name: "Sair" }));

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(localStorage.getItem("coachin:fila")).toBe("registro pendente");
  });
});
