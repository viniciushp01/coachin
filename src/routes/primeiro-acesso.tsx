import { createFileRoute, redirect } from "@tanstack/react-router";
import { PrimeiroAcessoPage } from "@/features/primeiro-acesso/PrimeiroAcessoPage";
import { exigirDestino } from "@/lib/sessao";
import { lerVinculoAtivo } from "@/lib/vinculo";

/** Hoje no aparelho, "aaaa-mm-dd" (o fuso do aparelho é o do aluno, regra 115). */
function hojeNoAparelho() {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// Primeiro acesso: só para aluno com vínculo e perfil incompleto (destinoDaSessao, regras 49 e 91).
export const Route = createFileRoute("/primeiro-acesso")({
  beforeLoad: ({ context }) => exigirDestino(context.queryClient, "/primeiro-acesso"),
  loader: async () => {
    const vinculo = await lerVinculoAtivo();
    // A guarda já garante o vínculo; se ele sumiu no meio do caminho, a raiz escolhe o destino.
    if (!vinculo) throw redirect({ to: "/", replace: true });
    return vinculo;
  },
  component: function TelaPrimeiroAcesso() {
    const vinculo = Route.useLoaderData();
    const { estado } = Route.useRouteContext();
    return (
      <PrimeiroAcessoPage
        vinculo={vinculo}
        avisoAceito={estado.tipo === "logado" && estado.avisoAceito}
        hoje={hojeNoAparelho()}
      />
    );
  },
});
