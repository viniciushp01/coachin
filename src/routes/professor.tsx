import { createFileRoute } from "@tanstack/react-router";
import { AreaProvisoria } from "@/features/acesso/AreaProvisoria";
import { lerAlunosComConvite } from "@/features/alunos/alunosComConvite";
import { exigirDestino } from "@/lib/sessao";
import { SectionRow } from "@/ui";

// Provisório até a Lista de alunos (fatia 3), que vira a tela raiz do professor (regra 54).
// Por ora a área já leva ao cadastro do aluno com convite (regra 57) e aos alunos com convite.
export const Route = createFileRoute("/professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/professor"),
  loader: () => lerAlunosComConvite(),
  staleTime: 0,
  component: function Area() {
    const { estado } = Route.useRouteContext();
    const alunos = Route.useLoaderData();
    const navegar = Route.useNavigate();
    return (
      <AreaProvisoria
        nome={estado.tipo === "logado" ? estado.nome : ""}
        area="professor"
        principal={{
          texto: "Cadastrar aluno",
          aoTocar: () => void navegar({ to: "/professor/cadastrar-aluno" }),
        }}
      >
        {alunos.length > 0 && (
          <section className="flex flex-col gap-12">
            <h2 className="text-overline text-text-secondary">Alunos com convite</h2>
            {alunos.map((a) => (
              <SectionRow
                key={a.id}
                icone="mail"
                titulo={a.nome}
                detalhe={a.detalhe}
                onClick={() =>
                  void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: a.id } })
                }
              />
            ))}
          </section>
        )}
      </AreaProvisoria>
    );
  },
});
