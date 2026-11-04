import clsx from "clsx";
import type { UseFormRegisterReturn } from "react-hook-form";

type Opcao = { valor: string; rotulo: string };

const MEDIDAS: Opcao[] = [
  { valor: "reps", rotulo: "Repetições" },
  { valor: "time", rotulo: "Tempo" },
];

const MODOS_DE_CARGA: Opcao[] = [
  { valor: "required", rotulo: "Sim" },
  { valor: "optional", rotulo: "Opcional" },
  { valor: "none", rotulo: "Não" },
];

/** Uma linha de opções de escolha única (Figma "Opção · …"): rádios de verdade, para o teclado. */
function GrupoDeOpcoes({
  legenda,
  opcoes,
  campo,
}: {
  legenda: string;
  opcoes: Opcao[];
  campo: UseFormRegisterReturn;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-8 text-label text-text-secondary">{legenda}</legend>
      <div className="flex gap-8">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="min-w-0 flex-1">
            <input type="radio" value={opcao.valor} className="peer sr-only" {...campo} />
            <span
              className={clsx(
                "flex h-[45px] items-center justify-center rounded-[14px] border-2 border-border-subtle bg-bg-surface px-8",
                "font-medium text-[14px]/[20px] text-text-primary",
                "peer-checked:border-border-brand peer-checked:bg-bg-brand-subtle peer-checked:text-text-brand",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-strong",
              )}
            >
              {opcao.rotulo}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** "Medida", "Modo de carga" e a nota de peso do corpo (regras 123 e 124; Biblioteca · 5). */
export function CamposDoExercicio({
  medida,
  carga,
}: {
  medida: UseFormRegisterReturn;
  carga: UseFormRegisterReturn;
}) {
  return (
    <>
      <GrupoDeOpcoes legenda="Medida" opcoes={MEDIDAS} campo={medida} />
      <GrupoDeOpcoes legenda="Modo de carga" opcoes={MODOS_DE_CARGA} campo={carga} />
      <p className="text-caption text-text-secondary">
        Peso do corpo (prancha, flexão): use “Não”. O aluno não vê carga nem “Editar carga”.
      </p>
    </>
  );
}
