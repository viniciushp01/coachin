import { useNavigate } from "@tanstack/react-router";
import { BarraFixa, Button, EmptyState, Tela } from "@/ui";

const textos = {
  expirado: {
    icone: "schedule",
    titulo: "Este link expirou",
    texto:
      "Os links para confirmar o e-mail valem por 1 dia. Entre com seu e-mail e senha para receber um novo link.",
  },
  nao_vale_mais: {
    icone: "swap_horiz",
    titulo: "Este link não vale mais",
    texto:
      "Se você já confirmou, é só entrar. Se ainda faltar, entre com seu e-mail e senha e peça outro link.",
  },
} as const;

/**
 * Link de confirmação de e-mail que não vale (regra 128). O botão é "Ir para o login", não
 * "Pedir novo link" (que leva à redefinição de senha): entrando, quem ainda não confirmou cai
 * em "Confirme seu e-mail" e pode reenviar (regra 127).
 */
export function LinkConfirmacaoPage({ situacao }: { situacao: "expirado" | "nao_vale_mais" }) {
  const navegar = useNavigate();
  const { icone, titulo, texto } = textos[situacao];
  return (
    <Tela barra="um">
      <EmptyState icone={icone} titulo={titulo} className="pt-16">
        {texto}
      </EmptyState>
      <BarraFixa>
        <Button onClick={() => navegar({ to: "/entrar" })}>Ir para o login</Button>
      </BarraFixa>
    </Tela>
  );
}
