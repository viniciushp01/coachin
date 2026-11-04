import clsx from "clsx";
import { useState } from "react";
import { Button } from "./Button";
import {
  casasAntesDoDia1,
  dataIso,
  diasNoMes,
  mesDe,
  nomeDoMes,
  somarMeses,
  type Mes,
} from "./datas";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";

const DIAS_DA_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];

type SeletorDeDataProps = {
  aberta: boolean;
  aoFechar: () => void;
  /** "aaaa-mm-dd" no fuso de quem chama. Datas anteriores ficam desabilitadas. */
  hoje: string;
  /** Data já escolhida, "aaaa-mm-dd". Anterior a hoje não vale: a folha abre em hoje. */
  valor: string;
  aoConfirmar: (data: string) => void;
};

/** Folha "Escolher início". Volta à data confirmada sempre que abre. */
export function SeletorDeData({ aberta, ...props }: SeletorDeDataProps) {
  return aberta ? <Conteudo {...props} /> : null;
}

function Conteudo({ aoFechar, hoje, valor, aoConfirmar }: Omit<SeletorDeDataProps, "aberta">) {
  const [escolhida, setEscolhida] = useState(valor < hoje ? hoje : valor);
  const [mes, setMes] = useState(() => mesDe(escolhida));

  return (
    <Sheet
      aberta
      aoFechar={aoFechar}
      titulo="Escolher início"
      acoes={
        <Button variante="primary" onClick={() => aoConfirmar(escolhida)}>
          Confirmar início
        </Button>
      }
    >
      <div className="flex flex-col gap-16">
        <div className="flex h-[36px] items-start justify-between pr-4 pl-8">
          <p className="text-body-strong text-text-primary">{nomeDoMes(mes)}</p>
          <div className="flex gap-4">
            <IconButton
              icone="chevron_left"
              rotulo="Mês anterior"
              tamanho="sm"
              onClick={() => setMes(somarMeses(mes, -1))}
            />
            <IconButton
              icone="chevron_right"
              rotulo="Próximo mês"
              tamanho="sm"
              onClick={() => setMes(somarMeses(mes, 1))}
            />
          </div>
        </div>
        <div aria-hidden="true" className="grid grid-cols-7">
          {DIAS_DA_SEMANA.map((letra, i) => (
            <span key={i} className="text-center text-label text-text-secondary">
              {letra}
            </span>
          ))}
        </div>
        <GradeDoMes mes={mes} hoje={hoje} escolhida={escolhida} aoEscolher={setEscolhida} />
        <p className="text-caption text-text-secondary">
          Datas passadas ficam desabilitadas. O início pode ser hoje ou uma data futura.
        </p>
      </div>
    </Sheet>
  );
}

function GradeDoMes({
  mes,
  hoje,
  escolhida,
  aoEscolher,
}: {
  mes: Mes;
  hoje: string;
  escolhida: string;
  aoEscolher: (data: string) => void;
}) {
  const nome = nomeDoMes(mes);
  const dias = Array.from({ length: diasNoMes(mes) }, (_, i) => i + 1);

  return (
    <div role="group" aria-label={`Dias de ${nome}`} className="grid grid-cols-7 gap-y-4">
      {Array.from({ length: casasAntesDoDia1(mes) }, (_, i) => (
        <span key={i} data-vazio />
      ))}
      {dias.map((dia) => {
        const data = dataIso(mes, dia);
        const ehHoje = data === hoje;
        const selecionado = data === escolhida;
        return (
          <button
            key={dia}
            type="button"
            disabled={data < hoje}
            aria-label={`${dia} de ${nome}`}
            aria-pressed={selecionado}
            aria-current={ehHoje ? "date" : undefined}
            onClick={() => aoEscolher(data)}
            className={clsx(
              "mx-auto flex h-[52px] w-[45px] flex-col items-center gap-4 rounded-control border-2 pt-4 text-body-strong disabled:opacity-35",
              ehHoje ? "bg-bg-surface-raised text-text-brand" : "text-text-secondary",
              selecionado ? "border-text-primary" : "border-transparent",
            )}
          >
            {dia}
            <span aria-hidden="true" className="size-[6px] rounded-[4px] bg-border-default" />
          </button>
        );
      })}
    </div>
  );
}
