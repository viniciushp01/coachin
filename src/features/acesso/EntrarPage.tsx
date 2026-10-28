import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { erroDeAuth } from "@/lib/erros";
import { email, senhaDoLogin } from "@/lib/formularios";
import { estadoSessaoQuery, registrarEntrada } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";
import { BarraFixa, Button, FormField, Tela, TextButton, useToast } from "@/ui";

const esquema = z.object({ email, senha: senhaDoLogin });

const rotaEntrar = getRouteApi("/entrar");

/**
 * Entrada da rota `/entrar`: lê o e-mail da busca (`?email=`) e, do estado da sessão que a
 * guarda da rota carregou, se a sessão venceu por inatividade.
 */
export function TelaEntrar() {
  const { email: emailDaBusca } = rotaEntrar.useSearch();
  const { estado } = rotaEntrar.useRouteContext();
  const sessaoExpirada = estado.tipo === "anonimo" && estado.sessaoExpirada === true;
  return <EntrarPage emailInicial={emailDaBusca} sessaoExpirada={sessaoExpirada} />;
}

type EntrarPageProps = {
  /** E-mail já preenchido, vindo de outra tela (ex.: "Entrar com este e-mail", regra 83). */
  emailInicial?: string;
  /** Sessão encerrada por 30 dias sem uso: título "Entre de novo" (regra 121). */
  sessaoExpirada?: boolean;
};

/**
 * Entrar (regras 39, 47 e 51). A mesma tela serve aos três papéis; o destino vem do servidor.
 * Erro de credenciais em toast neutro, campos preenchidos, sem bloqueio por tentativas.
 */
export function EntrarPage({ emailInicial = "", sessaoExpirada = false }: EntrarPageProps) {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const mostrarToast = useToast();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { email: emailInicial, senha: "" },
  });

  async function entrar(dados: z.infer<typeof esquema>) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: dados.email,
        password: dados.senha,
      });
      if (error) throw error;
    } catch (erro) {
      mostrarToast("error", erroDeAuth(erro).message);
      return;
    }
    // Conta como uso (regra 121) e descarta o estado "anônimo" guardado antes de a raiz
    // escolher o destino.
    registrarEntrada();
    queryClient.removeQueries({ queryKey: estadoSessaoQuery.queryKey });
    await navegar({ to: "/", replace: true });
  }

  return (
    <Tela barra="um">
      <form id="entrar" onSubmit={handleSubmit(entrar)} className="flex flex-col gap-16" noValidate>
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">{sessaoExpirada ? "Entre de novo" : "Entrar"}</h1>
          <p className="text-body text-text-secondary">
            {sessaoExpirada
              ? "Sua sessão expirou por inatividade. Use o e-mail e a senha do seu acesso."
              : "Use o e-mail e a senha do seu acesso."}
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
          <FormField
            rotulo="Senha"
            tipo="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            erro={errors.senha?.message}
            {...register("senha")}
          />
        </div>
        <TextButton
          className="self-start"
          onClick={() => {
            // Leva o e-mail já digitado, para não digitar de novo (regra 50).
            const emailDigitado = getValues("email").trim();
            void navegar({
              to: "/esqueci-a-senha",
              search: emailDigitado ? { email: emailDigitado } : {},
            });
          }}
        >
          Esqueci a senha
        </TextButton>
        <TextButton tom="muted" className="w-full" onClick={() => navegar({ to: "/criar-conta" })}>
          Não tem conta? Criar conta
        </TextButton>
      </form>
      <BarraFixa>
        <Button type="submit" form="entrar" disabled={isSubmitting}>
          Entrar
        </Button>
      </BarraFixa>
    </Tela>
  );
}
