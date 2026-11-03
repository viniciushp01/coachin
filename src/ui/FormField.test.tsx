// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DICA_SENHA_NOVA, email, senhaNova } from "@/lib/formularios";
import { FormField } from "./FormField";

afterEach(cleanup);

describe("FormField com dica", () => {
  it("mostra a dica sob o campo, ligada a ele", () => {
    render(<FormField rotulo="Senha" tipo="password" dica={DICA_SENHA_NOVA} />);
    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription(DICA_SENHA_NOVA);
  });

  it("com erro, mostra o erro no lugar da dica", () => {
    render(<FormField rotulo="Senha" tipo="password" dica={DICA_SENHA_NOVA} erro="Senha fraca." />);
    const campo = screen.getByLabelText("Senha");
    expect(campo).toHaveAccessibleDescription("Senha fraca.");
    expect(campo).toBeInvalid();
    expect(screen.queryByText(DICA_SENHA_NOVA)).not.toBeInTheDocument();
  });
});

const esquema = z.object({ email, senha: senhaNova });

function FormularioDeTeste({ aoEnviar }: { aoEnviar: (dados: z.infer<typeof esquema>) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: { email: "", senha: "" } });
  return (
    <form onSubmit={handleSubmit(aoEnviar)} noValidate>
      <FormField rotulo="E-mail" tipo="email" erro={errors.email?.message} {...register("email")} />
      <FormField
        rotulo="Senha"
        tipo="password"
        dica={DICA_SENHA_NOVA}
        erro={errors.senha?.message}
        {...register("senha")}
      />
      <button type="submit">Criar acesso</button>
    </form>
  );
}

describe("FormField com react-hook-form", () => {
  it("mostra os erros do schema e põe o foco no primeiro campo com erro", async () => {
    const usuario = userEvent.setup();
    const aoEnviar = vi.fn();
    render(<FormularioDeTeste aoEnviar={aoEnviar} />);

    await usuario.type(screen.getByLabelText("Senha"), "abcdefgh");
    await usuario.click(screen.getByRole("button", { name: "Criar acesso" }));

    expect(
      await screen.findByText("Digite um e-mail válido, como nome@exemplo.com."),
    ).toBeVisible();
    expect(
      screen.getByText("A senha precisa ter pelo menos 8 caracteres, com letras e números."),
    ).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    expect(aoEnviar).not.toHaveBeenCalled();
  });

  it("envia os valores digitados, sem perder o mostrar/ocultar senha", async () => {
    const usuario = userEvent.setup();
    const aoEnviar = vi.fn();
    render(<FormularioDeTeste aoEnviar={aoEnviar} />);

    await usuario.type(screen.getByLabelText("E-mail"), " ana@exemplo.com ");
    await usuario.type(screen.getByLabelText("Senha"), "abc12345");
    await usuario.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");

    await usuario.click(screen.getByRole("button", { name: "Criar acesso" }));
    expect(aoEnviar).toHaveBeenCalledWith(
      { email: "ana@exemplo.com", senha: "abc12345" },
      expect.anything(),
    );
  });
});
