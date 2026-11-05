import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { aoSincronizar, iniciarSincronia } from "@/lib/sincronia";
import { useToast } from "@/ui";
import { AVISO_ENVIADOS, AVISO_RECUSADOS } from "./textos";

/**
 * Liga o envio da fila local (regra 116) e avisa quando o envio acontece sozinho: "Registros
 * enviados." e o treino é lido de novo. Quando o envio vem de uma ação do aluno, a tela já avisa.
 */
export function SincronizadorDaFila() {
  const router = useRouter();
  const mostrarToast = useToast();

  useEffect(() => {
    const parar = iniciarSincronia();
    const desligar = aoSincronizar((aviso) => {
      void router.invalidate();
      if (aviso.silencioso) return;
      if (aviso.enviados.length > 0) mostrarToast("success", AVISO_ENVIADOS);
      else if (aviso.descartados.length > 0) mostrarToast("error", AVISO_RECUSADOS);
    });
    return () => {
      parar();
      desligar();
    };
  }, [router, mostrarToast]);

  return null;
}
