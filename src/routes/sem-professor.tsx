import { createFileRoute } from "@tanstack/react-router";
import { SemProfessorPage } from "@/features/acesso/SemProfessorPage";
import { ConvitePendentePage } from "@/features/convite/ConvitePendentePage";
import { lerConvitePendente } from "@/features/convite/convitePendente";
import { exigirDestino } from "@/lib/sessao";

// Aluno sem vínculo (regra 90): com convite pendente para o e-mail da conta, "Vincular ao
// professor?" mesmo sem o link (regra 173). Confere antes de mostrar e não guarda: a próxima conta
// neste aparelho não pode ver o convite da anterior.
export const Route = createFileRoute("/sem-professor")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/sem-professor"),
  loader: { handler: () => lerConvitePendente(), staleReloadMode: "blocking" },
  staleTime: 0,
  gcTime: 0,
  component: function SemProfessor() {
    const convite = Route.useLoaderData();
    const { estado } = Route.useRouteContext();
    if (!convite || estado.tipo !== "logado") return <SemProfessorPage />;
    return <ConvitePendentePage key={convite.id} convite={convite} email={estado.email} />;
  },
});
