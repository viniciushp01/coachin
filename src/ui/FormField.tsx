import clsx from "clsx";
import { useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { CODIGOS_PAIS } from "./codigosPais";
import { Icon } from "./Icon";

const caixa =
  "flex w-full rounded-control border-2 bg-bg-surface text-body text-text-primary " +
  "placeholder:text-text-disabled focus-within:border-border-strong";

type CampoBase = {
  rotulo: string;
  /** Mensagem de erro do campo (pt-BR). Com erro, a borda fica border-danger. */
  erro?: string;
  /** Dica sob o campo (ex.: requisitos da senha, regra 78). Com erro, o erro toma o lugar dela. */
  dica?: string;
};

/** Id do texto sob o campo (erro ou dica), para o aria-describedby. */
function idDaDescricao(id: string, { erro, dica }: Pick<CampoBase, "erro" | "dica">) {
  if (erro) return `${id}-erro`;
  if (dica) return `${id}-dica`;
  return undefined;
}

function Moldura({
  id,
  rotulo,
  erro,
  dica,
  children,
}: CampoBase & { id: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-8">
      <label htmlFor={id} className="text-label text-text-secondary">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-caption text-status-danger">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={`${id}-dica`} className="text-caption text-text-secondary">
            {dica}
          </p>
        )
      )}
    </div>
  );
}

type FormFieldProps = CampoBase &
  Omit<ComponentProps<"input">, "type"> & {
    /** text (e-mail, nome…) ou password (com mostrar/ocultar). */
    tipo?: "text" | "email" | "password";
  };

/** Campo de uma linha: texto centralizado na vertical, sem padding vertical. */
export function FormField({
  rotulo,
  erro,
  dica,
  tipo = "text",
  id,
  className,
  ...props
}: FormFieldProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const senha = tipo === "password";

  return (
    <Moldura id={idCampo} rotulo={rotulo} erro={erro} dica={dica}>
      <div
        className={clsx(
          caixa,
          "h-[52px] items-center justify-between gap-12 px-16",
          erro ? "border-border-danger" : "border-border-subtle",
          className,
        )}
      >
        <input
          id={idCampo}
          type={senha ? (mostrarSenha ? "text" : "password") : tipo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={idDaDescricao(idCampo, { erro, dica })}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-disabled"
          {...props}
        />
        {senha && (
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={mostrarSenha}
            className="-mr-8 flex size-40 shrink-0 items-center justify-center text-text-secondary"
          >
            <Icon nome={mostrarSenha ? "visibility" : "visibility_off"} />
          </button>
        )}
      </div>
    </Moldura>
  );
}

type DataFieldProps = CampoBase &
  Omit<ComponentProps<"input">, "type" | "min" | "max"> & {
    /** Data escolhida no seletor do aparelho, já em "dd/mm/aaaa". */
    aoEscolherData: (texto: string) => void;
    /** Limites do seletor, "aaaa-mm-dd" (padrão: de 1900 até sem limite). */
    min?: string | number;
    max?: string | number;
  };

/** O navegador abre o seletor de data por código? (Safari antigo e alguns WebViews não.) */
const temSeletorDeData = () =>
  typeof HTMLInputElement !== "undefined" &&
  typeof HTMLInputElement.prototype.showPicker === "function";

/**
 * Data digitável (máscara dd/mm/aaaa, feita por quem usa) com o ícone de calendário na ponta
 * direita, que abre o seletor do aparelho (regra 141). Sem `showPicker`, fica só a digitação.
 */
export function DataField({
  rotulo,
  erro,
  dica,
  id,
  className,
  aoEscolherData,
  min = "1900-01-01",
  max,
  ...props
}: DataFieldProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const seletor = useRef<HTMLInputElement>(null);
  const [comCalendario] = useState(temSeletorDeData);

  return (
    <Moldura id={idCampo} rotulo={rotulo} erro={erro} dica={dica}>
      <div
        className={clsx(
          caixa,
          "relative h-[52px] items-center justify-between gap-12 px-16",
          erro ? "border-border-danger" : "border-border-subtle",
          className,
        )}
      >
        <input
          id={idCampo}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          aria-invalid={erro ? true : undefined}
          aria-describedby={idDaDescricao(idCampo, { erro, dica })}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-disabled"
          {...props}
        />
        {comCalendario && (
          <>
            {/* O seletor nativo fica escondido sob o ícone; a data escolhida nunca é impossível. */}
            <input
              ref={seletor}
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              min={min}
              max={max}
              onChange={(e) => {
                const [ano, mes, dia] = e.target.value.split("-");
                if (ano && mes && dia) aoEscolherData(`${dia}/${mes}/${ano}`);
              }}
              className="pointer-events-none absolute right-16 bottom-0 size-px opacity-0"
            />
            <button
              type="button"
              onClick={() => seletor.current?.showPicker()}
              aria-label="Abrir calendário"
              className="-mr-8 flex size-40 shrink-0 items-center justify-center text-text-secondary"
            >
              <Icon nome="calendar_month" />
            </button>
          </>
        )}
      </div>
    </Moldura>
  );
}

type TextAreaFieldProps = CampoBase & ComponentProps<"textarea">;

/** Campo de várias linhas (FormField type=multiline): texto no topo, padding 16. */
export function TextAreaField({ rotulo, erro, dica, id, className, ...props }: TextAreaFieldProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  return (
    <Moldura id={idCampo} rotulo={rotulo} erro={erro} dica={dica}>
      <textarea
        id={idCampo}
        rows={3}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idDaDescricao(idCampo, { erro, dica })}
        className={clsx(
          caixa,
          "min-h-[96px] resize-none px-16 pt-16 outline-none",
          erro ? "border-border-danger" : "border-border-subtle",
          className,
        )}
        {...props}
      />
    </Moldura>
  );
}

type PhoneFieldProps = CampoBase &
  Omit<ComponentProps<"input">, "type"> & {
    codigoPais?: string;
    aoMudarCodigoPais?: (codigo: string) => void;
  };

/** Telefone: código do país (+55 por padrão) | número com DDD. */
export function PhoneField({
  rotulo,
  erro,
  dica,
  id,
  codigoPais = "+55",
  aoMudarCodigoPais,
  className,
  ...props
}: PhoneFieldProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  return (
    <Moldura id={idCampo} rotulo={rotulo} erro={erro} dica={dica}>
      <div
        className={clsx(
          caixa,
          "h-[52px] items-center gap-12 px-16",
          erro ? "border-border-danger" : "border-border-subtle",
          className,
        )}
      >
        <div className="relative flex shrink-0 items-center gap-4">
          <span aria-hidden="true">{codigoPais}</span>
          <Icon nome="keyboard_arrow_down" tamanho={20} />
          <select
            aria-label="Código do país"
            value={codigoPais}
            onChange={(e) => aoMudarCodigoPais?.(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {CODIGOS_PAIS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <span aria-hidden="true" className="h-24 w-px shrink-0 bg-border-default" />
        <input
          id={idCampo}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-invalid={erro ? true : undefined}
          aria-describedby={idDaDescricao(idCampo, { erro, dica })}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-disabled"
          {...props}
        />
      </div>
    </Moldura>
  );
}
