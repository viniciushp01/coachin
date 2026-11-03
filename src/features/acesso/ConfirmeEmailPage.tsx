import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { BarraFixa, Button, EmptyState, Tela } from "@/ui";
import { ReenviarLink } from "./ReenviarLink";
import { urlDeVoltaDaConfirmacao } from "./linkDeConfirmacao";

const rotaConfirme = getRouteApi("/confirme-seu-email");

/** Entrada da rota `/confirme-seu-email`: o e-mail e a origem vêm da busca. */
export function TelaConfirmeEmail() {
  const { email, doLogin } = rotaConfirme.useSearch();
  return <ConfirmeEmailPage email={email} doLogin={doLogin} />;
}

type ConfirmeEmailPageProps = {
  email: string;
  /** Veio do Login com o e-mail ainda não confirmado (regra 127). */
  doLogin?: boolean;
};

/**
 * "Confirme seu e-mail" (regras 89, 100 e 127): depois de criar a conta, ou ao tentar entrar
 * sem ter confirmado, o link de confirmação (válido por 1 dia) precisa ser aberto antes.
 */
export function ConfirmeEmailPage({ email, doLogin = false }: ConfirmeEmailPageProps) {
  const navegar = useNavigate();

  return (
    <Tela barra="um">
      <EmptyState icone="mail" titulo="Confirme seu e-mail" className="pt-16">
        {doLogin && "Seu e-mail ainda não foi confirmado. "}Enviamos um link para {email}. Toque
        nele para ativar sua conta. O link vale por 1 dia.
      </EmptyState>
      <ReenviarLink
        reenviar={() =>
          supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: urlDeVoltaDaConfirmacao() },
          })
        }
      />
      <BarraFixa>
        <Button onClick={() => navegar({ to: "/entrar", search: { email } })}>
          Voltar ao login
        </Button>
      </BarraFixa>
    </Tela>
  );
}
