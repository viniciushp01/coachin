import { useNavigate, type NavigateOptions } from "@tanstack/react-router";
import { ActiveWorkoutCard, BackButton, BarraFixa, Button, Chip, Notice, Tela } from "@/ui";
import type { AcaoDoRodape, AlunoVinculado } from "./alunoVinculado";
import { CHIP_DO_ALUNO } from "./listaDeAlunos";

type DestinoDaAcao = (alunoId: string) => NavigateOptions;

/**
 * Para onde cada ação do rodapé leva. O botão só aparece quando a ação tem destino, e cada ticket
 * liga o seu: "criar" no #90, "editar" no #96, "agendar" no #97.
 */
const DESTINOS: Partial<Record<AcaoDoRodape, DestinoDaAcao>> = {};

/** Rótulos do Figma: só "Criar treino" é o botão principal (regra 68; design.md, barra fixa). */
const BOTAO_DA_ACAO: Record<AcaoDoRodape, { texto: string; variante: "primary" | "secondary" }> = {
  editar: { texto: "Editar treino", variante: "secondary" },
  agendar: { texto: "Agendar novo treino", variante: "secondary" },
  criar: { texto: "Criar treino", variante: "primary" },
};

const BARRA_POR_QUANTIDADE = [undefined, "um", "dois"] as const;

/**
 * Tela do aluno com o acesso ativo, na visão do professor (regra 68; Figma "Professor ·
 * Acompanhar", seção 1, Aluno · 1 e 3): nome, status e o cartão do treino ou o aviso de sem treino.
 * Atalhos e avisos de pedido são da fatia 7; o aviso do treino agendado, do #97 (regra 152 (4)).
 */
export function AlunoVinculadoPage({
  aluno,
  destinos = DESTINOS,
}: {
  aluno: AlunoVinculado;
  destinos?: typeof DESTINOS;
}) {
  const navegar = useNavigate();
  const primeiroNome = aluno.nome.trim().split(/\s+/)[0] || aluno.nome;
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
            {primeiroNome} não tem treino ativo. Crie um para {primeiroNome} voltar a treinar.
          </Notice>
        )
      )}
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
