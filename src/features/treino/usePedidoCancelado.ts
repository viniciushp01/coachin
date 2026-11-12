import { useEffect, useState } from "react";
import { lerPedidoCancelado } from "./alunoDoTreino";

type Cancelamento = { telefone: string | null };

/**
 * Relê o pedido enquanto `vigiar` vale (etapa de fichas): ao abrir a etapa e sempre que a aba volta
 * a ficar visível, sem tempo real (regra 103). Uma vez cancelado, o aviso fica até sair da
 * montagem. Falha de leitura (ex.: sem conexão) não muda nada.
 */
export function usePedidoCancelado(alunoId: string, vigiar: boolean) {
  const [cancelado, setCancelado] = useState<Cancelamento | null>(null);
  const jaCancelado = cancelado !== null;

  useEffect(() => {
    if (!vigiar || jaCancelado) return;
    let ativo = true;
    const reler = () => {
      if (document.visibilityState === "hidden") return;
      lerPedidoCancelado(alunoId).then(
        (r) => ativo && r && setCancelado(r),
        () => undefined,
      );
    };
    reler();
    document.addEventListener("visibilitychange", reler);
    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", reler);
    };
  }, [alunoId, vigiar, jaCancelado]);

  return cancelado;
}
