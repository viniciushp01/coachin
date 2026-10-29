import { createFileRoute, redirect } from "@tanstack/react-router";
import { lerConviteGuardado } from "@/features/convite/conviteGuardado";
import { destinoDaRaiz } from "@/lib/destino";
import { estadoSessaoQuery } from "@/lib/sessao";

// A raiz não tem tela: leva cada pessoa para a sua área, conforme o servidor, ou de volta ao
// convite que ela abriu antes de entrar (regra 79).
export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const estado = await context.queryClient.ensureQueryData(estadoSessaoQuery);
    throw redirect({ ...destinoDaRaiz(estado, lerConviteGuardado()), replace: true });
  },
});
