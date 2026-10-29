import { createFileRoute } from "@tanstack/react-router";
import { ConvitePage } from "@/features/convite/ConvitePage";
import { lerProfessorAtual } from "@/lib/vinculo";
import { lerPrevia, telaDoConvite } from "@/features/convite/telaDoConvite";
import { rpc } from "@/lib/rpc";
import { estadoSessaoQuery } from "@/lib/sessao";

// Link do convite: rota pública, sem guarda de papel (regras 48, 79, 82, 97 e 98). O token é o
// segredo; a prévia é lida a cada abertura (sem conexão, cai em ErroDeRota com "Sem conexão").
export const Route = createFileRoute("/convite/$token")({
  loader: async ({ context, params }) => {
    const [sessao, previa] = await Promise.all([
      context.queryClient.ensureQueryData(estadoSessaoQuery),
      rpc("get_invite_preview", { p_token: params.token }),
    ]);
    // Aluno que já tem professor vê "Trocar de professor?" com o nome do atual (regra 98).
    const professorAtual =
      sessao.tipo === "logado" && sessao.papel === "aluno" && sessao.temProfessor
        ? await lerProfessorAtual()
        : null;
    return telaDoConvite(lerPrevia(previa), sessao, professorAtual);
  },
  staleTime: 0,
  component: function TelaConvite() {
    const tela = Route.useLoaderData();
    const { token } = Route.useParams();
    return <ConvitePage tela={tela} token={token} />;
  },
});
