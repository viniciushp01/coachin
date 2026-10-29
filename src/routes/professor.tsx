import { createFileRoute } from "@tanstack/react-router";
import { AreaProvisoria } from "@/features/acesso/AreaProvisoria";
import { exigirDestino } from "@/lib/sessao";

// Provisório até a Lista de alunos (fatia 3), que vira a tela raiz do professor (regra 54).
// Por ora a área já leva ao cadastro do aluno com convite (regra 57).
export const Route = createFileRoute("/professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  component: function Area() {
    const { estado } = Route.useRouteContext();
    const navegar = Route.useNavigate();
    return (
      <AreaProvisoria
        nome={estado.tipo === "logado" ? estado.nome : ""}
        area="professor"
        principal={{
          texto: "Cadastrar aluno",
          aoTocar: () => void navegar({ to: "/professor/cadastrar-aluno" }),
        }}
      />
    );
  },
});
