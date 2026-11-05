import { useEffect, useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { plural } from "@/lib/listas";
import { BackButton, BarraFixa, Button, FormField, Notice, Tela, useToast } from "@/ui";
import { ajustarExercicio, contarFichasDoExercicio, type ExercicioDaBusca } from "./biblioteca";
import { CamposDoExercicio } from "./CamposDoExercicio";

type AjustarExercicioProps = {
  exercicio: ExercicioDaBusca;
  aoVoltar: () => void;
  aoSalvar: (ajustado: ExercicioDaBusca) => void;
};

/**
 * Medida e modo de carga do exercício do professor (regras 123 e 151 (4); Biblioteca · 6). O nome é só
 * leitura. O aviso de fichas é só de repetições para tempo e não bloqueia; voltar não pergunta nada
 * (regra 157 (3)).
 */
export function AjustarExercicio({ exercicio, aoVoltar, aoSalvar }: AjustarExercicioProps) {
  const mostrarToast = useToast();
  const [medida, setMedida] = useState(exercicio.medida);
  const [carga, setCarga] = useState(exercicio.carga);
  const [fichas, setFichas] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const vaiParaTempo = exercicio.medida === "reps" && medida === "time";
  // De tempo para repetições nunca há aviso: nem precisa ler.
  const podeAvisar = exercicio.medida === "reps";

  useEffect(() => {
    if (!podeAvisar) return;
    let valida = true;
    contarFichasDoExercicio(exercicio.id).then(
      (total) => {
        if (valida) setFichas(total);
      },
      (causa: unknown) => {
        if (valida) mostrarToast("error", erroDaResposta(causa).message);
      },
    );
    return () => {
      valida = false;
    };
  }, [exercicio.id, podeAvisar, mostrarToast]);

  async function salvar() {
    setSalvando(true);
    try {
      aoSalvar(await ajustarExercicio({ exercicio, medida, carga }));
    } catch (causa) {
      mostrarToast("error", erroDaResposta(causa).message);
      setSalvando(false);
    }
  }

  return (
    <Tela barra="dois">
      <BackButton onClick={aoVoltar} />
      <h1 className="text-title-screen">Ajustar medida e carga</h1>
      <FormField rotulo="Nome do exercício" value={exercicio.nome} readOnly />
      <CamposDoExercicio
        medida={medida}
        carga={carga}
        aoMudarMedida={setMedida}
        aoMudarCarga={setCarga}
      />
      {vaiParaTempo && fichas > 0 && (
        <Notice tom="info" titulo={`Este exercício está em ${plural(fichas, "ficha", "fichas")}`}>
          Os valores ficam iguais: um “10” passa a aparecer como “10 s”. Ajuste as fichas depois, na
          edição.
        </Notice>
      )}
      <BarraFixa>
        <Button onClick={() => void salvar()} disabled={salvando}>
          Salvar
        </Button>
        <Button variante="secondary" onClick={aoVoltar}>
          Cancelar
        </Button>
      </BarraFixa>
    </Tela>
  );
}
