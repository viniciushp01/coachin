import { useState, type FormEvent } from "react";
import { MENSAGENS } from "@/lib/erros";
import { plural, primeiroNome } from "@/lib/listas";
import { BackButton, BarraFixa, Button, DateField, FormField, Notice, Stepper, Tela } from "@/ui";
import { formatarData } from "@/ui/datas";
import type { AlunoDoTreino } from "./alunoDoTreino";
import {
  avisoDoConvite,
  avisoDoInicio,
  fimDoTreino,
  SEMANAS_MAX,
  validarDados,
  type Rascunho,
} from "./rascunho";

type DadosDoTreinoProps = {
  aluno: AlunoDoTreino;
  rascunho: Rascunho;
  aoMudar: (mudanca: Partial<Rascunho>) => void;
  aoVoltar: () => void;
  aoContinuar: () => void;
};

/** Passo 1: nome, início, semanas, fim calculado e frequência (regras 3, 73, 75, 105 e 154). */
export function DadosDoTreino({
  aluno,
  rascunho,
  aoMudar,
  aoVoltar,
  aoContinuar,
}: DadosDoTreinoProps) {
  const { nome, inicio, semanas, frequencia } = rascunho;
  const [erroNome, setErroNome] = useState<string>();
  const [semanasValidas, setSemanasValidas] = useState(true);
  const convite = avisoDoConvite({
    convite: aluno.convite,
    nome: primeiroNome(aluno.nome),
    inicio,
    hoje: aluno.hoje,
  });

  function continuar(evento: FormEvent) {
    evento.preventDefault();
    const erros = validarDados({ nome, semanas });
    setErroNome(erros.nome);
    if (!erros.nome && !erros.semanas && semanasValidas) aoContinuar();
  }

  return (
    <Tela barra="um">
      <form id="dados-do-treino" onSubmit={continuar} className="flex flex-col gap-16" noValidate>
        <BackButton onClick={aoVoltar} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Criar treino</h1>
          <p className="truncate text-body text-text-secondary">Para {aluno.nome}</p>
        </div>
        <FormField
          rotulo="Nome do treino"
          placeholder="Ex.: Hipertrofia · Fase 3"
          autoComplete="off"
          value={nome}
          erro={erroNome}
          onChange={(e) => {
            aoMudar({ nome: e.target.value });
            setErroNome(undefined);
          }}
        />
        <DateField
          rotulo="Início"
          valor={inicio}
          hoje={aluno.hoje}
          aoMudar={(data) => aoMudar({ inicio: data })}
        />
        <Stepper
          rotulo="Número de semanas"
          valor={semanas}
          aoMudar={(valor) => aoMudar({ semanas: valor })}
          formatar={(valor) => plural(valor, "semana", "semanas")}
          maximo={SEMANAS_MAX}
          erroMaximo={MENSAGENS.weeks_invalid}
          aoMudarValidade={setSemanasValidas}
        />
        <Notice tom="neutral" titulo={`Termina em ${formatarData(fimDoTreino(inicio, semanas))}`}>
          {avisoDoInicio({
            inicio,
            hoje: aluno.hoje,
            semanas,
            temTreinoAtual: aluno.temTreinoAtual,
          })}
        </Notice>
        {convite && (
          <Notice tom="info" titulo={convite.titulo}>
            {convite.texto}
          </Notice>
        )}
        <FormField
          rotulo="Frequência sugerida (opcional)"
          placeholder="Ex.: 5x por semana"
          autoComplete="off"
          value={frequencia}
          onChange={(e) => aoMudar({ frequencia: e.target.value })}
        />
      </form>
      <BarraFixa>
        <Button type="submit" form="dados-do-treino">
          Continuar
        </Button>
      </BarraFixa>
    </Tela>
  );
}
