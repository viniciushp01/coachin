import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConvitePage } from "@/features/convite/ConvitePage";
import { lerProfessorAtual } from "@/lib/vinculo";
import { lerPrevia, telaDoConvite } from "@/features/convite/telaDoConvite";
import { destinoDoConvite } from "@/lib/destino";
import { rpc } from "@/lib/rpc";
import { estadoSessaoQuery } from "@/lib/sessao";

// Link do convite: rota pública, sem guarda de papel (regras 48, 79, 82, 97 e 98). O token é o
// segredo; a prévia é lida a cada abertura (sem conexão, cai em ErroDeRota com "Sem conexão").
export const Route = createFileRoute("/convite/$token")({
  loader: async ({ context, params }) => {
    const sessao = await context.queryClient.ensureQueryData(estadoSessaoQuery);
    // Conta bloqueada: o bloqueio vem antes de qualquer estado do convite (regra 137).
    const bloqueio = destinoDoConvite(sessao);
    if (bloqueio) throw redirect({ to: bloqueio, replace: true });
    const previa = await rpc("get_invite_preview", { p_token: params.token });
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
