import { QueryClient } from "@tanstack/react-query";
import { ErroApp } from "./erros";

/** Erros de regra (código do banco) não melhoram tentando de novo; só falha de rede tenta. */
function deveTentarDeNovo(tentativas: number, erro: unknown) {
  if (erro instanceof ErroApp && erro.codigo !== "sem_conexao") return false;
  return tentativas < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: deveTentarDeNovo,
      // Recarrega ao voltar a ficar visível (o app costuma ficar aberto em segundo plano).
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
    mutations: {
      // Escritas nunca repetem sozinhas: a fila offline (regra 116) cuida do reenvio.
      retry: false,
    },
  },
});
