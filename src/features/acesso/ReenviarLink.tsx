import { useEffect, useState } from "react";
import { erroDeAuth } from "@/lib/erros";
import { TextButton, useToast } from "@/ui";

const ESPERA = 60;

type ReenviarLinkProps = {
  /** Pede o novo link ao Supabase; o erro, se houver, vem na resposta ou como exceção. */
  reenviar: () => Promise<{ error: unknown }>;
};

/**
 * "Não recebeu? Reenviar link" (regra 100). Enviado, fica desabilitado por 60 s com contagem
 * ("Reenviar em 45 s"); no limite de envios do Supabase, toast da regra 130 e segue disponível.
 */
export function ReenviarLink({ reenviar }: ReenviarLinkProps) {
  const mostrarToast = useToast();
  // Prazo medido pelo relógio, não por contagem de toques do timer: aba em segundo plano
  // atrasa os timers, mas não o fim da espera.
  const [liberaEm, setLiberaEm] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  const [enviando, setEnviando] = useState(false);
  const restante = Math.max(0, Math.ceil((liberaEm - agora) / 1000));

  useEffect(() => {
    if (restante <= 0) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [restante]);

  async function aoTocar() {
    setEnviando(true);
    try {
      const { error } = await reenviar();
      if (error) throw error;
      const inicio = Date.now();
      setAgora(inicio);
      setLiberaEm(inicio + ESPERA * 1000);
    } catch (erro) {
      mostrarToast("error", erroDeAuth(erro).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TextButton tom="muted" onClick={aoTocar} disabled={enviando || restante > 0}>
      {restante > 0 ? `Reenviar em ${restante} s` : "Não recebeu? Reenviar link"}
    </TextButton>
  );
}
