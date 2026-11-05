import { useState } from "react";
import { Button, FormField, Sheet } from "@/ui";
import type { CargaDoExercicio } from "./dados";
import { diaDaEdicao, lerCarga, textoDaCarga } from "./logica";

type FolhaCargaProps = {
  /** O exercício aberto; nulo = fechada. */
  exercicio: { nome: string; carga: CargaDoExercicio | undefined } | null;
  ocupado: boolean;
  aoFechar: () => void;
  aoSalvar: (kg: number) => void;
};

/**
 * Folha "Carga" (Figma "Ficha · 2 Editar carga", regras 26 a 28). Editar a carga não marca o
 * treino como feito.
 */
export function FolhaCarga({ exercicio, ocupado, aoFechar, aoSalvar }: FolhaCargaProps) {
  const [texto, setTexto] = useState(exercicio?.carga ? textoDaCarga(exercicio.carga.kg) : "");
  const [erro, setErro] = useState<string>();
  const carga = exercicio?.carga;

  function salvar() {
    const kg = lerCarga(texto);
    if (kg === null) return setErro("Digite uma carga entre 0,1 e 1000 kg.");
    aoSalvar(kg);
  }

  return (
    <Sheet
      aberta={exercicio !== null}
      aoFechar={aoFechar}
      titulo="Carga"
      acoes={
        <>
          <Button disabled={ocupado} onClick={salvar}>
            Salvar carga
          </Button>
          <Button variante="secondary" onClick={aoFechar}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-4">
          <p className="text-body-strong text-text-primary">{exercicio?.nome}</p>
          {carga && (
            <p className="text-caption">
              Última carga: {textoDaCarga(carga.kg)} kg · {diaDaEdicao(carga.editadaEm)}
            </p>
          )}
        </div>
        <FormField
          rotulo="Carga (kg)"
          inputMode="decimal"
          value={texto}
          erro={erro}
          dica="Editar a carga não marca o treino como feito."
          onChange={(e) => {
            setTexto(e.target.value);
            setErro(undefined);
          }}
        />
      </div>
    </Sheet>
  );
}
