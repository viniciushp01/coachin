import { createFileRoute } from "@tanstack/react-router";
import { BloqueadoPage } from "@/features/acesso/BloqueadoPage";
import { exigirDestino } from "@/lib/sessao";

export const Route = createFileRoute("/bloqueado")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/bloqueado"),
  component: function Bloqueado() {
    const { estado } = Route.useRouteContext();
    return <BloqueadoPage papel={estado.tipo === "logado" ? estado.papel : "aluno"} />;
  },
});
