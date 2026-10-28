import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { BarraFixa, Button, EmptyState, Tela } from "@/ui";
import { pedirLinkDeSenha } from "./linkDeSenha";
import { ReenviarLink } from "./ReenviarLink";

const rotaConfira = getRouteApi("/confira-seu-email");

/** Entrada da rota `/confira-seu-email`: o e-mail vem da busca (`?email=`). */
export function TelaConfiraEmail() {
  const { email } = rotaConfira.useSearch();
  return <ConfiraEmailPage email={email} />;
}

/** "Confira seu e-mail" do "Esqueci a senha" (regras 50, 88 e 100). */
export function ConfiraEmailPage({ email }: { email: string }) {
  const navegar = useNavigate();

  return (
    <Tela barra="um">
      <EmptyState icone="mail" titulo="Confira seu e-mail" className="pt-16">
        Enviamos um link para {email}. Toque nele para criar uma nova senha. O link vale por 1 dia.
      </EmptyState>
      <ReenviarLink reenviar={() => pedirLinkDeSenha(email)} />
      <BarraFixa>
        <Button onClick={() => navegar({ to: "/entrar", search: { email } })}>
          Voltar ao login
        </Button>
      </BarraFixa>
    </Tela>
  );
}
