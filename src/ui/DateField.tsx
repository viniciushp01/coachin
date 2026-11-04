import { useId, useState } from "react";
import { formatarData } from "./datas";
import { Moldura } from "./FormField";
import { Icon } from "./Icon";
import { SeletorDeData } from "./SeletorDeData";

type DateFieldProps = {
  rotulo: string;
  /** "aaaa-mm-dd". */
  valor: string;
  /** "aaaa-mm-dd" no fuso de quem chama: nada antes disso pode ser escolhido. */
  hoje: string;
  aoMudar: (data: string) => void;
};

/** Campo de data que abre o seletor: "Hoje · 29/10/2026" ou "03/11/2026". */
export function DateField({ rotulo, valor, hoje, aoMudar }: DateFieldProps) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const texto = valor === hoje ? `Hoje · ${formatarData(valor)}` : formatarData(valor);

  return (
    <Moldura id={id} rotulo={rotulo}>
      <button
        id={id}
        type="button"
        aria-label={`${rotulo}: ${texto}`}
        onClick={() => setAberto(true)}
        className="flex h-[52px] w-full items-center justify-between gap-12 rounded-control border-2 border-border-subtle bg-bg-surface px-16 text-left text-body text-text-primary outline-none focus-visible:border-border-strong"
      >
        <span className="min-w-0 flex-1 truncate">{texto}</span>
        <span className="shrink-0 text-text-secondary">
          <Icon nome="calendar_month" />
        </span>
      </button>
      <SeletorDeData
        aberta={aberto}
        aoFechar={() => setAberto(false)}
        hoje={hoje}
        valor={valor}
        aoConfirmar={(data) => {
          aoMudar(data);
          setAberto(false);
        }}
      />
    </Moldura>
  );
}
