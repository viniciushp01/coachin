import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SemProfessorPage } from "@/features/acesso/SemProfessorPage";
import { ErroApp, erroDaResposta, type CodigoErro } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { estadoSessaoQuery, sair } from "@/lib/sessao";
import { useToast } from "@/ui";
import { TelaContaVinculada, TelaVincular } from "./ConvitePage";
import type { ConvitePendente } from "./convitePendente";

type ConvitePendentePageProps = { convite: ConvitePendente; email: string };

/** Nestes erros o convite segue valendo: fica na tela, para tentar de novo. */
const DA_PARA_TENTAR_DE_NOVO: CodigoErro[] = [
  "sem_conexao",
  "erro_desconhecido",
  "teacher_unavailable",
];

/**
 * "Vincular ao professor?" sem o link (regra 173): o convite pendente para o e-mail da conta,
 * aceito ou recusado pelo id. Convite que mudou no caminho vira toast e volta a "Você ainda não
 * tem um professor", sem as telas sem saída do link, porque aqui ninguém abriu um link.
 */
export function ConvitePendentePage({ convite, email }: ConvitePendentePageProps) {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const mostrarToast = useToast();
  const [enviando, setEnviando] = useState(false);
  // Fica no estado da tela: o loader pode rodar de novo (SIGNED_IN ao voltar ao app).
  const [fim, setFim] = useState<"vinculada" | "sem_professor" | null>(null);

  // Voltar ao app com o aceite em voo relê o convite e pode desmontar esta tela antes da resposta.
  const montada = useRef(false);
  useEffect(() => {
    montada.current = true;
    return () => {
      montada.current = false;
    };
  }, []);

  async function enviar(chamada: () => Promise<unknown>, depois: "vinculada" | "sem_professor") {
    setEnviando(true);
    try {
      await chamada();
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      mostrarToast("error", erro.message);
      setEnviando(false);
      if (DA_PARA_TENTAR_DE_NOVO.includes(erro.codigo)) return;
      // O convite ou a conta mudou (ex.: vinculada em outro aparelho): o destino é lido de novo.
      setFim("sem_professor");
      queryClient.removeQueries({ queryKey: estadoSessaoQuery.queryKey });
      await navegar({ to: "/", replace: true });
      return;
    }
    // O vínculo muda o destino (primeiro acesso ou início): a sessão é lida de novo.
    if (depois === "vinculada") {
      queryClient.removeQueries({ queryKey: estadoSessaoQuery.queryKey });
    }
    setFim(depois);
    if (!montada.current) await navegar({ to: "/", replace: true });
  }

  /** "Usar outra conta" (regra 97): sai só neste aparelho; sem link, não há convite a guardar. */
  async function usarOutraConta() {
    setEnviando(true);
    await sair();
    await navegar({ to: "/entrar" });
  }

  if (fim === "vinculada") {
    return (
      <TelaContaVinculada
        professor={convite.professor}
        aoIrParaInicio={() => void navegar({ to: "/", replace: true })}
      />
    );
  }
  if (fim === "sem_professor") return <SemProfessorPage />;
  return (
    <TelaVincular
      professor={convite.professor}
      email={email}
      enviando={enviando}
      aoVincular={() =>
        void enviar(() => rpc("accept_my_student_invite", { p_invite_id: convite.id }), "vinculada")
      }
      aoRecusar={() =>
        void enviar(
          () => rpc("decline_my_student_invite", { p_invite_id: convite.id }),
          "sem_professor",
        )
      }
      aoUsarOutraConta={() => void usarOutraConta()}
    />
  );
}
