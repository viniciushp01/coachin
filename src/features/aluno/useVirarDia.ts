import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { hojeDoAluno } from "@/lib/diaDoAluno";

const FOLGA_MS = 1000;

/** Quanto falta para a próxima meia-noite no fuso do aluno (regra 115). */
export function msAteMeiaNoite(fuso: string | null | undefined, agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso ?? "America/Sao_Paulo",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(agora);
  const n = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const passado =
    ((n("hour") * 60 + n("minute")) * 60 + n("second")) * 1000 + agora.getMilliseconds();
  return 86_400_000 - passado;
}

/**
 * Virada do dia com o app aberto (regra 163, item 5): o "hoje" vem do loader e nada o refaz sozinho.
 * Ao voltar a ficar visível e na meia-noite do fuso do aluno, compara com o `hoje` mostrado e, se o
 * dia mudou, relê a rota (sem recarregar a página, sem toast). Os timers atrasam em segundo plano:
 * por isso a checagem ao voltar. Sem conexão, o loader refaz o "hoje" sobre a cópia local.
 */
export function useVirarDia(hoje: string, fuso: string | null | undefined) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const conferir = () => {
      clearTimeout(timer);
      if (hojeDoAluno(fuso) !== hoje) {
        void router.invalidate();
        return;
      }
      timer = setTimeout(conferir, msAteMeiaNoite(fuso) + FOLGA_MS);
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") conferir();
    };
    conferir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [hoje, fuso, router]);
}
