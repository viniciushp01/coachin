import { useEffect, useState } from "react";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { BackButton, SearchField, SectionRow, Tela, useToast } from "@/ui";
import { buscarExercicios, type ExercicioDaBusca } from "./biblioteca";
import { FolhaDoExercicio } from "./FolhaDoExercicio";
import { novoExercicio, tituloDaFicha, type ExercicioDoRascunho, type Ficha } from "./rascunho";

const ESPERA_DA_BUSCA_MS = 250;

type AdicionarExercicioProps = {
  ficha: Ficha;
  indice: number;
  aoVoltar: () => void;
  aoAdicionar: (exercicio: ExercicioDoRascunho) => void;
};

/** Busca simples na biblioteca; tocar abre a folha (regras 74 e 151 (2); Biblioteca · 1). */
export function AdicionarExercicio({
  ficha,
  indice,
  aoVoltar,
  aoAdicionar,
}: AdicionarExercicioProps) {
  const mostrarToast = useToast();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ExercicioDaBusca[]>([]);
  const [escolhido, setEscolhido] = useState<ExercicioDaBusca | null>(null);

  useEffect(() => {
    let valida = true;
    const espera = setTimeout(() => {
      buscarExercicios(termo.trim()).then(
        (lista) => {
          if (valida) setResultados(lista);
        },
        (causa: unknown) => {
          if (!valida) return;
          const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
          mostrarToast("error", erro.message);
        },
      );
    }, ESPERA_DA_BUSCA_MS);
    return () => {
      valida = false;
      clearTimeout(espera);
    };
  }, [termo, mostrarToast]);

  return (
    <Tela>
      <BackButton onClick={aoVoltar} />
      <div className="flex flex-col gap-8">
        <h1 className="text-title-screen">Adicionar exercício</h1>
        <p className="truncate text-body text-text-secondary">{tituloDaFicha(ficha, indice)}</p>
      </div>
      <SearchField
        rotulo="Buscar exercício"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
      />
      <ul className="flex flex-col gap-8">
        {resultados.map((exercicio) => (
          <li key={exercicio.id}>
            <SectionRow
              icone="fitness_center"
              titulo={exercicio.nome}
              detalhe={exercicio.detalhe}
              onClick={() => setEscolhido(exercicio)}
            />
          </li>
        ))}
      </ul>
      {escolhido && (
        <FolhaDoExercicio
          key={escolhido.id}
          nome={escolhido.nome}
          medida={escolhido.measure}
          aoFechar={() => setEscolhido(null)}
          aoSalvar={(valores) => aoAdicionar(novoExercicio(escolhido, valores))}
        />
      )}
    </Tela>
  );
}
