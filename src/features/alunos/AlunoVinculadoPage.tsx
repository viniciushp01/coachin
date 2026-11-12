import { useNavigate, type NavigateOptions } from "@tanstack/react-router";
import { primeiroNome } from "@/lib/listas";
import { textoDosAnteriores } from "@/features/acompanhar/logica";
import {
  ActiveWorkoutCard,
  BackButton,
  BarraFixa,
  Button,
  Chip,
  Notice,
  SectionRow,
  Tela,
} from "@/ui";
import type { AcaoDoRodape, AlunoVinculado } from "./alunoVinculado";
import { CHIP_DO_ALUNO, diaEMes } from "./listaDeAlunos";

type DestinoDaAcao = (alunoId: string) => NavigateOptions;

/**
 * Para onde cada ação do rodapé leva. O botão só aparece quando a ação tem destino, e cada ticket
 * liga o seu: "criar" no #90, "editar" no #96, "agendar" no #97.
 */
const DESTINOS: Partial<Record<AcaoDoRodape, DestinoDaAcao>> = {
  criar: (alunoId) => ({ to: "/professor/alunos/$alunoId/criar-treino", params: { alunoId } }),
  editar: (alunoId) => ({ to: "/professor/alunos/$alunoId/editar-treino", params: { alunoId } }),
};

/** Rótulos do Figma: só "Criar treino" é o botão principal (regra 68; design.md, barra fixa). */
const BOTAO_DA_ACAO: Record<AcaoDoRodape, { texto: string; variante: "primary" | "secondary" }> = {
  editar: { texto: "Editar treino", variante: "secondary" },
  agendar: { texto: "Agendar novo treino", variante: "secondary" },
  criar: { texto: "Criar treino", variante: "primary" },
};

/** Os atalhos de acompanhamento (regra 68; Figma "Professor · Acompanhar", seção 1). */
const ATALHOS = {
  calendario: "/professor/alunos/$alunoId/calendario",
  progressao: "/professor/alunos/$alunoId/progressao",
  perfil: "/professor/alunos/$alunoId/perfil",
  historico: "/professor/alunos/$alunoId/historico",
} as const;

const BARRA_POR_QUANTIDADE = [undefined, "um", "dois"] as const;

/**
 * Tela do aluno com o acesso ativo, na visão do professor (regra 68; Figma "Professor ·
 * Acompanhar", seção 1, Aluno · 1 e 3): nome, status e o cartão do treino ou o aviso de sem treino.
 * Os quatro atalhos levam ao acompanhamento, só leitura (fatia 7a); sem treino ativo, só Perfil e
 * Histórico, como no Figma (Aluno · 3). O aviso do treino agendado é do #97.
 */
export function AlunoVinculadoPage({
  aluno,
  destinos = DESTINOS,
}: {
  aluno: AlunoVinculado;
  destinos?: typeof DESTINOS;
}) {
  const navegar = useNavigate();
  const nome = primeiroNome(aluno.nome);
  const chip = CHIP_DO_ALUNO[aluno.status];
  const acoes = aluno.acoes.filter((acao) => destinos[acao]);

  return (
    <Tela barra={BARRA_POR_QUANTIDADE[acoes.length]}>
      <BackButton onClick={() => void navegar({ to: "/professor" })} />
      <h1 className="w-full truncate text-title-screen">{aluno.nome}</h1>
      <div className="flex">
        <Chip tom={chip.tom}>{chip.texto}</Chip>
      </div>
      {aluno.treino ? (
        <ActiveWorkoutCard {...aluno.treino} />
      ) : (
        !aluno.agendado && (
          <Notice tom="neutral" titulo="Sem treino ativo">
            {nome} não tem treino ativo. Crie um para {nome} voltar a treinar.
          </Notice>
        )
      )}
      <nav aria-label="Acompanhar" className="flex flex-col gap-8">
        {aluno.treino && (
          <>
            <SectionRow
              icone="calendar_month"
              titulo="Calendário"
              detalhe="Marcações dos treinos feitos"
              onClick={() =>
                void navegar({ to: ATALHOS.calendario, params: { alunoId: aluno.id } })
              }
            />
            <SectionRow
              icone="trending_up"
              titulo="Progressão de carga"
              detalhe="Última carga de cada exercício"
              onClick={() =>
                void navegar({ to: ATALHOS.progressao, params: { alunoId: aluno.id } })
              }
            />
          </>
        )}
        <SectionRow
          icone="person"
          titulo="Perfil"
          detalhe={
            aluno.perfilAtualizadoEm
              ? `Atualizado em ${diaEMes(aluno.perfilAtualizadoEm)}`
              : "Ainda sem dados"
          }
          onClick={() => void navegar({ to: ATALHOS.perfil, params: { alunoId: aluno.id } })}
        />
        <SectionRow
          icone="history"
          titulo="Histórico de treinos"
          detalhe={textoDosAnteriores(aluno.treinosAnteriores)}
          onClick={() => void navegar({ to: ATALHOS.historico, params: { alunoId: aluno.id } })}
        />
      </nav>
      {acoes.length > 0 && (
        <BarraFixa>
          {acoes.map((acao) => (
            <Button
              key={acao}
              variante={BOTAO_DA_ACAO[acao].variante}
              onClick={() => void navegar(destinos[acao]!(aluno.id))}
            >
              {BOTAO_DA_ACAO[acao].texto}
            </Button>
          ))}
        </BarraFixa>
      )}
    </Tela>
  );
}
