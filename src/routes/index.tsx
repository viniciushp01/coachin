import { createFileRoute, redirect } from "@tanstack/react-router";
import { destinoDaSessao } from "@/lib/destino";
import { estadoSessaoQuery } from "@/lib/sessao";

// A raiz não tem tela: leva cada pessoa para a sua área, conforme o servidor.
export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const estado = await context.queryClient.ensureQueryData(estadoSessaoQuery);
    throw redirect({ to: destinoDaSessao(estado), replace: true });
  },
});
