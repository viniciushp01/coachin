import { createFileRoute } from "@tanstack/react-router";
import { TelaNovaSenha } from "@/features/acesso/NovaSenhaPage";
import { situacaoDoLink } from "@/features/acesso/retornoDoLink";
import { registrarEntrada } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";

type BuscaNovaSenha = {
  /** Hora em que o link foi pedido (posta pelo app no endereço de volta). */
  pedido?: number;
};

// Volta do link de "Esqueci a senha". Sem guarda de papel: o link abre uma sessão de
// recuperação, e a guarda mandaria a pessoa para a área dela em vez de trocar a senha.
export const Route = createFileRoute("/nova-senha")({
  validateSearch: (busca: Record<string, unknown>): BuscaNovaSenha => {
    const pedido = Number(busca.pedido);
    return Number.isFinite(pedido) && pedido > 0 ? { pedido } : {};
  },
  beforeLoad: async ({ search }) => {
    // `getSession` espera o Supabase ler o link; com erro, o `#error=…` continua no endereço.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const situacao = situacaoDoLink({
      hash: window.location.hash,
      pedidoEm: search.pedido,
      agora: Date.now(),
      temSessao: session !== null,
    });
    // A sessão do link conta como uso: sem isso, a regra dos 30 dias a encerraria (regra 121).
    if (situacao === "valido") registrarEntrada();
    return { situacao };
  },
  component: TelaNovaSenha,
});
