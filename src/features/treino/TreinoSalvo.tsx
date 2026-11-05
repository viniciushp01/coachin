import { primeiroNome } from "@/lib/listas";
import { BackButton, BarraFixa, Button, EmptyState, Tela } from "@/ui";
import type { AlunoDoTreino } from "./alunoDoTreino";
import { diaEMes, type Rascunho } from "./rascunho";

type TreinoSalvoProps = {
  aluno: AlunoDoTreino;
  rascunho: Rascunho;
  aoVoltar: () => void;
};

/** "Treino salvo" ou "Treino agendado" (regras 75 e 150 (1); Criar treino · 7, 7b e 8). */
export function TreinoSalvo({ aluno, rascunho, aoVoltar }: TreinoSalvoProps) {
  const nome = primeiroNome(aluno.nome);
  const agendado = rascunho.inicio > aluno.hoje;
  const semAceite = aluno.convite !== null;
  const anterior = aluno.temTreinoAtual ? ` O anterior foi para o Histórico de ${nome}.` : "";
  return (
    <Tela barra="um">
      <BackButton onClick={aoVoltar} />
      <EmptyState
        icone="check_circle"
        titulo={agendado ? "Treino agendado" : "Treino salvo"}
        className="flex-1 justify-center"
      >
        {agendado
          ? `Começa em ${diaEMes(rascunho.inicio)}. Só você vê até lá, e pode alterar ou cancelar antes.`
          : semAceite
            ? `O treino de ${nome} já está salvo. Começa a contar hoje, mesmo antes do aceite.`
            : `O treino de ${nome} já está ativo.${anterior}`}
      </EmptyState>
      <BarraFixa>
        <Button onClick={aoVoltar}>Voltar ao aluno</Button>
      </BarraFixa>
    </Tela>
  );
}
