import { useId, useState } from "react";
import { Moldura } from "./FormField";
import { IconButton } from "./IconButton";

type StepperProps = {
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  /** Texto do valor fora da digitação, como "8 semanas" ou "1 semana". */
  formatar: (valor: number) => string;
  /** No mínimo, o − fica desabilitado (35%). Não há máximo (regra 105). */
  minimo?: number;
};

/** Número com − e + ou digitação direta. Em foco, o campo mostra só o número para editar. */
export function Stepper({ rotulo, valor, aoMudar, formatar, minimo = 1 }: StepperProps) {
  const id = useId();
  const [rascunho, setRascunho] = useState<string | null>(null);
  const nome = rotulo.toLowerCase();

  function confirmarRascunho() {
    if (rascunho !== null && rascunho !== "") {
      const digitado = Math.max(Number(rascunho), minimo);
      if (digitado !== valor) aoMudar(digitado);
    }
  }

  function passo(delta: number) {
    const proximo = Math.max(valor + delta, minimo);
    if (proximo !== valor) aoMudar(proximo);
    if (rascunho !== null) setRascunho(String(proximo));
  }

  return (
    <Moldura id={id} rotulo={rotulo}>
      <div className="flex h-[52px] w-full items-center justify-between gap-8 rounded-control border-2 border-border-subtle bg-bg-surface px-8 focus-within:border-border-strong">
        <IconButton
          icone="remove"
          rotulo={`Diminuir ${nome}`}
          tamanho="sm"
          disabled={valor <= minimo}
          onClick={() => passo(-1)}
        />
        <input
          id={id}
          type="text"
          role="spinbutton"
          inputMode="numeric"
          aria-valuenow={valor}
          aria-valuemin={minimo}
          aria-valuetext={formatar(valor)}
          value={rascunho ?? formatar(valor)}
          onFocus={(e) => {
            setRascunho(String(valor));
            // O valor só muda no próximo render; selecionar depois dele.
            const campo = e.currentTarget;
            requestAnimationFrame(() => campo.select());
          }}
          onChange={(e) => setRascunho(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            confirmarRascunho();
            setRascunho(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              passo(e.key === "ArrowUp" ? 1 : -1);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-center text-body-strong text-text-primary outline-none"
        />
        <IconButton icone="add" rotulo={`Aumentar ${nome}`} tamanho="sm" onClick={() => passo(1)} />
      </div>
    </Moldura>
  );
}
