import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { erroDeAuth } from "@/lib/erros";
import { supabase } from "@/lib/supabase";
import { BarraFixa, Button, FormField, Tela, useToast } from "@/ui";

/**
 * Entrar · versão mínima da Fase 0 (para o "olá" autenticado).
 * A fatia 1 completa esta tela: "Esqueci a senha", "Criar conta", validação com zod,
 * "Entre de novo" na sessão expirada (regra 121) e limite de tentativas.
 */
export function EntrarPage() {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(dados.get("email")).trim(),
      password: String(dados.get("senha")),
    });
    setEnviando(false);
    if (error) {
      mostrarToast("error", erroDeAuth(error).message);
      return;
    }
    await navegar({ to: "/", replace: true });
  }

  return (
    <Tela barra="um">
      <form id="entrar" onSubmit={entrar} className="flex flex-col gap-16" noValidate>
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Entrar</h1>
          <p className="text-body text-text-secondary">Use o e-mail e a senha do seu acesso.</p>
        </div>
        <div className="flex flex-col gap-16">
          <FormField
            rotulo="E-mail"
            name="email"
            tipo="email"
            autoComplete="email"
            placeholder="seuemail@exemplo.com"
            required
          />
          <FormField
            rotulo="Senha"
            name="senha"
            tipo="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
          />
        </div>
      </form>
      <BarraFixa>
        <Button type="submit" form="entrar" disabled={enviando}>
          Entrar
        </Button>
      </BarraFixa>
    </Tela>
  );
}
