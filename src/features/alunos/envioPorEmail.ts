import { useEffect, useState } from "react";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { chamarFuncao } from "@/lib/funcoes";
import { useToast } from "@/ui";

const ESPERA_MS = 60_000;
const ENVIADO = "Convite enviado por e-mail."; // regra 136

/** Erros em que o servidor já contou o envio: a espera de 60 s vale (regra 139). */
const CONTA_COMO_ENVIO = ["email_send_failed"];

/**
 * Envio do convite por e-mail (Edge Function `enviar-convite`, regras 136, 139 e 140): manda só o
 * token, mostra o toast do resultado e segura o botão por 60 s com contagem ("Reenviar em 45 s").
 * `enviadoEm` (invites.email_sent_at) retoma a espera de um envio anterior, ao abrir o pendente.
 */
export function useEnvioPorEmail(enviadoEm?: string | null) {
  const mostrarToast = useToast();
  // Prazo medido pelo relógio, como em ReenviarLink: aba em segundo plano atrasa os timers.
  const [liberaEm, setLiberaEm] = useState(() =>
    enviadoEm ? Date.parse(enviadoEm) + ESPERA_MS : 0,
  );
  const [agora, setAgora] = useState(() => Date.now());
  const [enviando, setEnviando] = useState(false);
  const restante = Math.max(0, Math.ceil((liberaEm - agora) / 1000));

  useEffect(() => {
    if (restante <= 0) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [restante]);

  function esperar() {
    const inicio = Date.now();
    setAgora(inicio);
    setLiberaEm(inicio + ESPERA_MS);
  }

  /** Envia; `true` se o e-mail saiu. */
  async function enviar(token: string): Promise<boolean> {
    setEnviando(true);
    try {
      await chamarFuncao("enviar-convite", { token });
      esperar();
      mostrarToast("success", ENVIADO);
      return true;
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      if (CONTA_COMO_ENVIO.includes(erro.codigo)) esperar();
      mostrarToast("error", erro.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { enviar, enviando, restante };
}

/** Texto do botão durante a espera (regra 139). */
export const textoDaEspera = (restante: number, texto: string) =>
  restante > 0 ? `Reenviar em ${restante} s` : texto;
