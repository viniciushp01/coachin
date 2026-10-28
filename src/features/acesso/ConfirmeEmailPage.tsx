import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { BarraFixa, Button, EmptyState, Tela } from "@/ui";
import { ReenviarLink } from "./ReenviarLink";
import { urlDoApp } from "./urlDoApp";

const rotaConfirme = getRouteApi("/confirme-seu-email");

/** Entrada da rota `/confirme-seu-email`: o e-mail vem da busca (`?email=`). */
export function TelaConfirmeEmail() {
  const { email } = rotaConfirme.useSearch();
  return <ConfirmeEmailPage email={email} />;
}

/**
 * "Confirme seu e-mail" (regras 89 e 100): depois de criar a conta, o link de confirmação
 * (válido por 1 dia) precisa ser aberto antes de entrar.
 */
export function ConfirmeEmailPage({ email }: { email: string }) {
  const navegar = useNavigate();

  return (
    <Tela barra="um">
      <EmptyState icone="mail" titulo="Confirme seu e-mail" className="pt-16">
        Enviamos um link para {email}. Toque nele para ativar sua conta. O link vale por 1 dia.
      </EmptyState>
      <ReenviarLink
        reenviar={() =>
          supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: urlDoApp("/entrar") },
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
