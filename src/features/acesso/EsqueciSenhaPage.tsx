import { zodResolver } from "@hookform/resolvers/zod";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { erroDeAuth } from "@/lib/erros";
import { email } from "@/lib/formularios";
import { BackButton, BarraFixa, Button, FormField, Tela, useToast } from "@/ui";
import { pedirLinkDeSenha } from "./linkDeSenha";

const esquema = z.object({ email });

const rotaEsqueci = getRouteApi("/esqueci-a-senha");

/** Entrada da rota `/esqueci-a-senha`: o e-mail pode vir da busca (`?email=`). */
export function TelaEsqueciSenha() {
  const { email: emailDaBusca } = rotaEsqueci.useSearch();
  return <EsqueciSenhaPage emailInicial={emailDaBusca} />;
}

/**
 * "Esqueci a senha" · pedir e-mail (regra 50). E-mail sem conta segue igual para "Confira seu
 * e-mail": a tela não revela quem tem conta.
 */
export function EsqueciSenhaPage({ emailInicial = "" }: { emailInicial?: string }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: { email: emailInicial } });

  async function enviar(dados: z.infer<typeof esquema>) {
    try {
      const { error } = await pedirLinkDeSenha(dados.email);
      if (error) throw error;
    } catch (erro) {
      mostrarToast("error", erroDeAuth(erro).message);
      return;
    }
    await navegar({ to: "/confira-seu-email", search: { email: dados.email } });
  }

  return (
    <Tela barra="um">
      <form
        id="esqueci-a-senha"
        onSubmit={handleSubmit(enviar)}
        className="flex flex-col gap-16"
        noValidate
      >
        <BackButton onClick={() => navegar({ to: "/entrar" })} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Esqueci a senha</h1>
          <p className="text-body text-text-secondary">
            Informe o e-mail do seu acesso. Vamos enviar um link para você criar uma nova senha.
          </p>
        </div>
        <FormField
          rotulo="E-mail"
          tipo="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          erro={errors.email?.message}
          {...register("email")}
        />
      </form>
      <BarraFixa>
        <Button type="submit" form="esqueci-a-senha" disabled={isSubmitting}>
          Enviar link
        </Button>
      </BarraFixa>
    </Tela>
  );
}
