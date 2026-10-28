import { createFileRoute } from "@tanstack/react-router";
import { AreaProvisoria } from "@/features/acesso/AreaProvisoria";
import { exigirDestino } from "@/lib/sessao";

// Provisório: a tela de verdade chega com a fatia correspondente (docs/WORKFLOW.md, Fase 1).
export const Route = createFileRoute("/aluno")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/aluno"),
  component: function Area() {
    const { estado } = Route.useRouteContext();
    return <AreaProvisoria nome={estado.tipo === "logado" ? estado.nome : ""} area="aluno" />;
  },
});
