import { useState } from "react";
import { ConviteGerado, type LinkDoConvite } from "@/features/alunos/ConviteGerado";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { primeiroNome } from "@/lib/listas";
import { rpc } from "@/lib/rpc";
import { BackButton, BarraFixa, Button, EmptyState, Tela, useToast } from "@/ui";
import type { AlunoDoTreino } from "./alunoDoTreino";
import { diaEMes, type Rascunho } from "./rascunho";

type TreinoSalvoProps = {
  aluno: AlunoDoTreino;
  rascunho: Rascunho;
  aoVoltar: () => void;
};

/**
 * "Treino salvo" ou "Treino agendado" (regras 75 e 150 (1); Criar treino · 7, 7b e 8). Aluno sem
 * convite (regra 164 (4), Criar treino · 7d): "Enviar convite agora" (laranja) gera o primeiro
 * convite e abre "Convite gerado"; "Agora não" volta ao aluno.
 */
export function TreinoSalvo({ aluno, rascunho, aoVoltar }: TreinoSalvoProps) {
  const mostrarToast = useToast();
  const [enviando, setEnviando] = useState(false);
  const [convite, setConvite] = useState<LinkDoConvite>();
  const nome = primeiroNome(aluno.nome);
  const agendado = rascunho.inicio > aluno.hoje;
  const semConvite = aluno.convite === "sem_convite";
  const semAceite = aluno.convite !== null;
  const anterior = aluno.temTreinoAtual ? ` O anterior foi para o Histórico de ${nome}.` : "";

  async function enviarConvite() {
    setEnviando(true);
    try {
      const { token } = (await rpc("send_student_invite", { p_student_id: aluno.id })) as {
        token: string;
      };
      setConvite({ nome: aluno.nome, comEmail: Boolean(aluno.email), token });
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      mostrarToast("error", erro.message);
      setEnviando(false);
    }
  }

  if (convite) return <ConviteGerado {...convite} />;

  const texto = agendado
    ? `Começa em ${diaEMes(rascunho.inicio)}. Só você vê até lá, e pode alterar ou cancelar antes.`
    : semConvite
      ? `O treino de ${nome} já está salvo. Envie o convite para ${nome} ver o treino no app.`
      : semAceite
        ? `O treino de ${nome} já está salvo. Começa a contar hoje, mesmo antes do aceite.`
        : `O treino de ${nome} já está ativo.${anterior}`;

  return (
    <Tela barra={semConvite ? "dois" : "um"}>
      <BackButton onClick={aoVoltar} />
      <EmptyState
        icone="check_circle"
        titulo={agendado ? "Treino agendado" : "Treino salvo"}
        className="flex-1 justify-center"
      >
        {texto}
      </EmptyState>
      <BarraFixa>
        {semConvite ? (
          <>
            <Button onClick={() => void enviarConvite()} disabled={enviando}>
              Enviar convite agora
            </Button>
            <Button variante="secondary" onClick={aoVoltar}>
              Agora não
            </Button>
          </>
        ) : (
          <Button onClick={aoVoltar}>Voltar ao aluno</Button>
        )}
      </BarraFixa>
    </Tela>
  );
}
