import clsx from "clsx";
import { useEffect, useId, useState } from "react";
import { flushSync } from "react-dom";
import { Moldura } from "./FormField";
import { IconButton } from "./IconButton";

type StepperProps = {
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  /** Texto do valor fora da digitação, como "8 semanas" ou "1 semana". */
  formatar: (valor: number) => string;
  /** No mínimo, o − fica desabilitado (35%). */
  minimo?: number;
  /** No máximo, o + fica desabilitado (35%). */
  maximo: number;
  /** Erro do campo quando digitam ou colam mais que o máximo, como "Use de 1 a 104 semanas.". */
  erroMaximo: string;
  /**
   * Avisa se o campo está válido. Acima do máximo, o número fica no campo com o erro e `aoMudar`
   * não é chamado: `valor` continua o último válido, e a tela não deve seguir enquanto for false.
   */
  aoMudarValidade?: (valido: boolean) => void;
};

/** Número com − e + ou digitação direta. Em foco, o campo mostra só o número para editar. */
export function Stepper({
  rotulo,
  valor,
  aoMudar,
  formatar,
  minimo = 1,
  maximo,
  erroMaximo,
  aoMudarValidade,
}: StepperProps) {
  const id = useId();
  const [rascunho, setRascunho] = useState<string | null>(null);
  const nome = rotulo.toLowerCase();
  const acimaDoMaximo = rascunho !== null && Number(rascunho) > maximo;

  useEffect(() => {
    aoMudarValidade?.(!acimaDoMaximo);
  }, [acimaDoMaximo, aoMudarValidade]);

  function confirmarRascunho() {
    if (rascunho !== null && rascunho !== "") {
      const digitado = Math.max(Number(rascunho), minimo);
      if (digitado !== valor) aoMudar(digitado);
    }
  }

  /** Com número acima do máximo no campo, qualquer passo leva ao máximo e tira o erro. */
  function passo(delta: number, noCampo = false) {
    const proximo = acimaDoMaximo ? maximo : Math.min(Math.max(valor + delta, minimo), maximo);
    if (proximo !== valor) aoMudar(proximo);
    setRascunho(noCampo ? String(proximo) : null);
  }

  return (
    <Moldura id={id} rotulo={rotulo} erro={acimaDoMaximo ? erroMaximo : undefined}>
      <div
        className={clsx(
          "flex h-[52px] w-full items-center justify-between gap-8 rounded-control border-2 bg-bg-surface px-8",
          acimaDoMaximo
            ? "border-border-danger"
            : "border-border-subtle focus-within:border-border-strong",
        )}
      >
        <IconButton
          icone="remove"
          rotulo={`Diminuir ${nome}`}
          tamanho="sm"
          disabled={!acimaDoMaximo && valor <= minimo}
          onClick={() => passo(-1)}
        />
        <input
          id={id}
          type="text"
          role="spinbutton"
          inputMode="numeric"
          aria-valuenow={valor}
          aria-valuemin={minimo}
          aria-valuemax={maximo}
          aria-valuetext={acimaDoMaximo ? rascunho : formatar(valor)}
          aria-invalid={acimaDoMaximo ? true : undefined}
          aria-describedby={acimaDoMaximo ? `${id}-erro` : undefined}
          value={rascunho ?? formatar(valor)}
          onFocus={(e) => {
            // Renderiza agora para selecionar o número já trocado. Selecionar depois (em outro quadro)
            // poderia apagar um dígito recém-digitado.
            const campo = e.currentTarget;
            if (!acimaDoMaximo) flushSync(() => setRascunho(String(valor)));
            campo.select();
          }}
          onChange={(e) => setRascunho(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            if (acimaDoMaximo) return;
            confirmarRascunho();
            setRascunho(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              passo(e.key === "ArrowUp" ? 1 : -1, true);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-center text-body-strong text-text-primary outline-none"
        />
        <IconButton
          icone="add"
          rotulo={`Aumentar ${nome}`}
          tamanho="sm"
          disabled={valor >= maximo}
          onClick={() => passo(1)}
        />
      </div>
    </Moldura>
  );
}
