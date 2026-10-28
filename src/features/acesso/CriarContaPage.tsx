import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErroApp, erroDeAuth } from "@/lib/erros";
import { DICA_SENHA_NOVA, email, senhaNova } from "@/lib/formularios";
import { supabase } from "@/lib/supabase";
import { BackButton, BarraFixa, Button, FormField, Tela, TextButton, useToast } from "@/ui";
import { urlDoApp } from "./urlDoApp";

const esquema = z.object({ email, senha: senhaNova });

/**
 * "Criar acesso" da conta aberta (regras 47, 78, 83 e 89): qualquer pessoa cria a conta; o
 * e-mail precisa ser confirmado antes de entrar. O treino aparece depois do convite.
 */
export function CriarContaPage() {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [emailEmUso, setEmailEmUso] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: { email: "", senha: "" } });

  async function criar(dados: z.infer<typeof esquema>) {
    setEmailEmUso(undefined);
    let erro: ErroApp;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: dados.email,
        password: dados.senha,
        options: { emailRedirectTo: urlDoApp("/entrar") },
      });
      if (error) throw error;
      // Com a confirmação de e-mail ligada, o Supabase não acusa e-mail já confirmado com erro:
      // devolve um usuário sem identidades (para não revelar quem tem conta a terceiros).
      if (data.user?.identities?.length === 0) throw new ErroApp("user_already_exists");
      await navegar({ to: "/confirme-seu-email", search: { email: dados.email } });
      return;
    } catch (causa) {
      erro = erroDeAuth(causa);
    }
    if (erro.codigo === "user_already_exists") {
      setError("email", { message: erro.message }, { shouldFocus: true });
      setEmailEmUso(dados.email);
    } else if (erro.codigo === "weak_password") {
      setError("senha", { message: erro.message }, { shouldFocus: true });
    } else {
      mostrarToast("error", erro.message);
    }
  }

  return (
    <Tela barra="um">
      <form
        id="criar-conta"
        onSubmit={handleSubmit(criar)}
        className="flex flex-col gap-16"
        noValidate
      >
        <BackButton onClick={() => navegar({ to: "/entrar" })} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Criar acesso</h1>
          <p className="text-body text-text-secondary">
            Crie seu acesso com seu e-mail. O treino aparece depois que um professor te convidar.
          </p>
        </div>
        <div className="flex flex-col gap-16">
          <FormField
            rotulo="E-mail"
            tipo="email"
            inputMode="email"
            autoComplete="email"
            placeholder="seuemail@exemplo.com"
            erro={errors.email?.message}
            {...register("email")}
          />
          {emailEmUso && (
            // Atalhos do e-mail em uso (regra 83). "Esqueci a senha" entra com a tela dela (#17).
            <div className="flex gap-24">
              <TextButton onClick={() => navegar({ to: "/entrar", search: { email: emailEmUso } })}>
                Entrar com este e-mail
              </TextButton>
            </div>
          )}
          <FormField
            rotulo="Senha"
            tipo="password"
            autoComplete="new-password"
            placeholder="Crie uma senha"
            dica={DICA_SENHA_NOVA}
            erro={errors.senha?.message}
            {...register("senha")}
          />
        </div>
      </form>
      <BarraFixa>
        <Button type="submit" form="criar-conta" disabled={isSubmitting}>
          Continuar
        </Button>
      </BarraFixa>
    </Tela>
  );
}
