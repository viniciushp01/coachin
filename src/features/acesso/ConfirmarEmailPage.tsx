import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { erroDeAuth } from "@/lib/erros";
import { BarraFixa, Button, EmptyState, Tela, useToast } from "@/ui";
import { LinkConfirmacaoPage } from "./LinkConfirmacaoPage";
import { confirmarEmailPeloToque } from "./linkDeConfirmacao";

const rotaConfirmar = getRouteApi("/confirmar-email");

/**
 * Entrada da rota `/confirmar-email`: a guarda da rota já decidiu. Link novo (com `token_hash`):
 * "Confirmar e-mail" com botão (regra 176). Link antigo que não vale: a tela da regra 128.
 */
export function TelaLinkConfirmacao() {
  const volta = rotaConfirmar.useRouteContext();
  const { pedido, convite } = rotaConfirmar.useSearch();
  if (volta.tipo === "confirmar")
    return <ConfirmarEmailPage tokenHash={volta.tokenHash} pedidoEm={pedido} convite={convite} />;
  return <LinkConfirmacaoPage situacao={volta.situacao} />;
}

type ConfirmarEmailPageProps = {
  tokenHash: string;
  /** Hora do pedido do link (`?pedido=`), para separar vencido de já usado. */
  pedidoEm?: number;
  /** Convite que veio no link (regra 172); segue para o Login. */
  convite?: string;
};

/**
 * "Confirmar e-mail" (regra 176): abrir o link não confirma nem gasta o token; só o toque no
 * botão confirma. Assim, abrir o link de novo, em outro navegador ou por um verificador de
 * links do e-mail não faz quem já confirmou achar que o cadastro falhou.
 */
export function ConfirmarEmailPage({ tokenHash, pedidoEm, convite }: ConfirmarEmailPageProps) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [situacao, setSituacao] = useState<"expirado" | "nao_vale_mais" | null>(null);

  async function aoTocar() {
    setConfirmando(true);
    try {
      const resultado = await confirmarEmailPeloToque({ tokenHash, pedidoEm, agora: Date.now() });
      if (resultado.tipo === "tela") {
        setSituacao(resultado.situacao);
        return;
      }
      await navegar({
        to: "/entrar",
        search: {
          ...(resultado.email ? { email: resultado.email } : {}),
          confirmado: true,
          ...(convite ? { convite } : {}),
        },
        replace: true,
      });
    } catch (erro) {
      mostrarToast("error", erroDeAuth(erro).message);
    } finally {
      setConfirmando(false);
    }
  }

  if (situacao) return <LinkConfirmacaoPage situacao={situacao} />;

  return (
    <Tela barra="um">
      <EmptyState icone="mail" titulo="Confirmar e-mail" className="pt-16">
        Falta só um passo para ativar sua conta no Coach In. Toque no botão abaixo para confirmar
        este e-mail.
      </EmptyState>
      <BarraFixa>
        <Button onClick={aoTocar} disabled={confirmando}>
          Confirmar e-mail
        </Button>
      </BarraFixa>
    </Tela>
  );
}
