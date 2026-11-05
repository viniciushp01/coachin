import { SegmentedControl } from "@/ui";
import type { ModoDeCarga } from "./exercicioNovo";
import type { Medida } from "./medida";

const MEDIDAS = [
  { valor: "reps", rotulo: "Repetições" },
  { valor: "time", rotulo: "Tempo" },
] as const;

const MODOS_DE_CARGA = [
  { valor: "required", rotulo: "Sim" },
  { valor: "optional", rotulo: "Opcional" },
  { valor: "none", rotulo: "Não" },
] as const;

/** "Medida", "Modo de carga" e a nota de peso do corpo (regras 123, 124 e 157 (5)). */
export function CamposDoExercicio({
  medida,
  carga,
  aoMudarMedida,
  aoMudarCarga,
}: {
  medida: Medida;
  carga: ModoDeCarga;
  aoMudarMedida: (medida: Medida) => void;
  aoMudarCarga: (carga: ModoDeCarga) => void;
}) {
  return (
    <>
      <SegmentedControl rotulo="Medida" opcoes={MEDIDAS} valor={medida} aoMudar={aoMudarMedida} />
      <SegmentedControl
        rotulo="Modo de carga"
        opcoes={MODOS_DE_CARGA}
        valor={carga}
        aoMudar={aoMudarCarga}
      />
      <p className="text-caption text-text-secondary">
        Peso do corpo (prancha, flexão): use “Não”. O aluno não vê carga nem “Editar carga”.
      </p>
    </>
  );
}
