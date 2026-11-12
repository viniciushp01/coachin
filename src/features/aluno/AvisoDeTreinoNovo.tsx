import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { Button, Sheet } from "@/ui";
import { textoDoTreinoNovo } from "./textos";

type TreinoNovo = { workout_id: string; workout_name: string; teacher_name: string | null };

/**
 * Pop-up "Seu treino novo chegou" (regras 117 e 170; Figma "Aluno · Entrada", seção 11, "Treino
 * novo · 1"). Pergunta ao banco ao abrir o Início e quando o app volta a ficar visível. O banco
 * só devolve o treino ativo ainda não visto (o mais recente; edição não conta, regra 112).
 * Sem conexão a consulta não roda e nada aparece: não entra na fila nem na cópia local (regra 116).
 * Fechar por qualquer caminho marca o treino como visto, uma vez.
 */
export function AvisoDeTreinoNovo({ offline }: { offline?: boolean }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<TreinoNovo | null>(null);
  const consultando = useRef(false);
  const vistos = useRef(new Set<string>());

  useEffect(() => {
    let montado = true;
    const consultar = () => {
      if (offline || consultando.current || navigator.onLine === false) return;
      consultando.current = true;
      rpc("pending_new_workout_notice")
        .then(
          (resposta) => {
            const novo = resposta as TreinoNovo | null;
            if (montado && novo?.workout_id && !vistos.current.has(novo.workout_id)) setAviso(novo);
          },
          () => {
            // Sem conexão ou falha passageira: fica para a próxima abertura, sem aviso de erro.
          },
        )
        .finally(() => {
          consultando.current = false;
        });
    };
    consultar();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") consultar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      montado = false;
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [offline]);

  function fechar(verTreino = false) {
    if (!aviso) return;
    const id = aviso.workout_id;
    setAviso(null);
    if (!vistos.current.has(id)) {
      vistos.current.add(id);
      rpc("acknowledge_new_workout", { p_workout_id: id }).catch(() => {
        // Não marcou (ex.: caiu a conexão): o pop-up volta na próxima abertura do app.
      });
    }
    if (verTreino) void router.invalidate();
  }

  return (
    <Sheet
      aberta={aviso !== null}
      aoFechar={() => fechar()}
      titulo="Seu treino novo chegou"
      acoes={
        <>
          <Button onClick={() => fechar(true)}>Ver meu treino</Button>
          <Button variante="secondary" onClick={() => fechar()}>
            Fechar
          </Button>
        </>
      }
    >
      {aviso && textoDoTreinoNovo(aviso.teacher_name, aviso.workout_name)}
    </Sheet>
  );
}
