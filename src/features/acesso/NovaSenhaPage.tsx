import { zodResolver } from "@hookform/resolvers/zod";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { erroDeAuth } from "@/lib/erros";
import { DICA_SENHA_NOVA, senhaNova } from "@/lib/formularios";
import { supabase } from "@/lib/supabase";
import { BarraFixa, Button, EmptyState, FormField, Tela, useToast } from "@/ui";
import type { SituacaoDoLink } from "./retornoDoLink";

const esquema = z.object({ senha: senhaNova });

const rotaNovaSenha = getRouteApi("/nova-senha");

/** Entrada da rota `/nova-senha`: a guarda da rota já decidiu a situação do link. */
export function TelaNovaSenha() {
  const { situacao } = rotaNovaSenha.useRouteContext();
  return <NovaSenhaPage situacao={situacao} />;
}

/**
 * Volta do link de "Esqueci a senha" (regras 50, 88 e 100): "Criar nova senha" se o link vale,
 * senão "Este link expirou" ou "Este link não vale mais". Salvar desconecta todos os aparelhos
 * (regra 121) e segue para "Senha alterada".
 */
export function NovaSenhaPage({ situacao }: { situacao: SituacaoDoLink }) {
  const navegar = useNavigate();
  const [alterada, setAlterada] = useState(false);

  if (alterada) {
    return (
      <Aviso
        icone="check_circle"
        titulo="Senha alterada"
        botao="Ir para o login"
        aoTocar={() => navegar({ to: "/entrar" })}
      >
        Pronto! Agora você já pode entrar com a nova senha.
      </Aviso>
    );
  }
  if (situacao === "expirado") {
    return (
      <Aviso
        icone="schedule"
        titulo="Este link expirou"
        botao="Pedir novo link"
        aoTocar={() => navegar({ to: "/esqueci-a-senha" })}
      >
        Os links para criar uma nova senha valem por 1 dia. Peça um novo link e tente de novo.
      </Aviso>
    );
  }
  if (situacao === "nao_vale_mais") {
    return (
      <Aviso
        icone="swap_horiz"
        titulo="Este link não vale mais"
        botao="Pedir novo link"
        aoTocar={() => navegar({ to: "/esqueci-a-senha" })}
      >
        Ele já foi usado ou foi substituído por um mais novo. Se ainda precisar, peça um novo link.
      </Aviso>
    );
  }
  return <CriarNovaSenha aoSalvar={() => setAlterada(true)} />;
}

function CriarNovaSenha({ aoSalvar }: { aoSalvar: () => void }) {
  const mostrarToast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: { senha: "" } });

  async function salvar(dados: z.infer<typeof esquema>) {
    try {
      const { error } = await supabase.auth.updateUser({ password: dados.senha });
      if (error) throw error;
    } catch (causa) {
      const erro = erroDeAuth(causa);
      // Senha fraca (regra 78) ou igual à atual (regra 131): erro no campo, sem "Senha alterada".
      if (erro.codigo === "weak_password" || erro.codigo === "same_password") {
        setError("senha", { message: erro.message }, { shouldFocus: true });
      } else {
        mostrarToast("error", erro.message);
      }
      return;
    }
    // Regra 121: trocar a senha desconecta os outros aparelhos; este também sai, porque o
    // fluxo segue para o Login (regra 50). A senha já mudou, então uma falha aqui não volta atrás.
    await supabase.auth.signOut({ scope: "global" });
    aoSalvar();
  }

  return (
    <Tela barra="um">
      <form
        id="nova-senha"
        onSubmit={handleSubmit(salvar)}
        className="flex flex-col gap-16"
        noValidate
      >
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Criar nova senha</h1>
          <p className="text-body text-text-secondary">
            Escolha a senha que você vai usar para entrar.
          </p>
        </div>
        <FormField
          rotulo="Nova senha"
          tipo="password"
          autoComplete="new-password"
          placeholder="Crie uma senha"
          dica={DICA_SENHA_NOVA}
          erro={errors.senha?.message}
          {...register("senha")}
        />
      </form>
      <BarraFixa>
        <Button type="submit" form="nova-senha" disabled={isSubmitting}>
          Salvar senha
        </Button>
      </BarraFixa>
    </Tela>
  );
}

type AvisoProps = {
  icone: "check_circle" | "schedule" | "swap_horiz";
  titulo: string;
  children: string;
  botao: string;
  aoTocar: () => void;
};

function Aviso({ icone, titulo, children, botao, aoTocar }: AvisoProps) {
  return (
    <Tela barra="um">
      <EmptyState icone={icone} titulo={titulo} className="pt-16">
        {children}
      </EmptyState>
      <BarraFixa>
        <Button onClick={aoTocar}>{botao}</Button>
      </BarraFixa>
    </Tela>
  );
}
