import { useEffect, useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { BackButton, SearchField, SectionRow, Tela, TextButton, useToast } from "@/ui";
import { buscarExercicios, type ExercicioDaBusca } from "./biblioteca";
import { CriarExercicio } from "./CriarExercicio";
import { procurarParecido } from "./exercicioNovo";
import { FolhaDoExercicio } from "./FolhaDoExercicio";
import { novoExercicio, tituloDaFicha, type ExercicioDoRascunho, type Ficha } from "./rascunho";

const ESPERA_DA_BUSCA_MS = 250;

type AdicionarExercicioProps = {
  ficha: Ficha;
  indice: number;
  /** O passo "novo-exercicio": a criação fica na rota para o "voltar" do aparelho. */
  criando: boolean;
  aoCriar: () => void;
  aoVoltar: () => void;
  aoAdicionar: (exercicio: ExercicioDoRascunho) => void;
};

/** Busca simples na biblioteca; tocar abre a folha (regras 74 e 151 (2); Biblioteca · 1). */
export function AdicionarExercicio({
  ficha,
  indice,
  criando,
  aoCriar,
  aoVoltar,
  aoAdicionar,
}: AdicionarExercicioProps) {
  const mostrarToast = useToast();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ExercicioDaBusca[]>([]);
  const [escolhido, setEscolhido] = useState<ExercicioDaBusca | null>(null);
  const [criacao, setCriacao] = useState<{
    nome: string;
    parecido: ExercicioDaBusca | null;
  } | null>(null);
  const [procurandoParecido, setProcurandoParecido] = useState(false);
  /** Muda ao voltar da criação: o exercício novo precisa aparecer na busca. */
  const [versaoDaBusca, setVersaoDaBusca] = useState(0);
  const nomeDigitado = termo.trim();

  useEffect(() => {
    let valida = true;
    const espera = setTimeout(() => {
      buscarExercicios(termo.trim()).then(
        (lista) => {
          if (valida) setResultados(lista);
        },
        (causa: unknown) => {
          if (valida) mostrarToast("error", erroDaResposta(causa).message);
        },
      );
    }, ESPERA_DA_BUSCA_MS);
    return () => {
      valida = false;
      clearTimeout(espera);
    };
  }, [termo, versaoDaBusca, mostrarToast]);

  async function tocarEmCriar() {
    setProcurandoParecido(true);
    try {
      setCriacao({ nome: nomeDigitado, parecido: await procurarParecido(nomeDigitado) });
      aoCriar();
    } catch (causa) {
      mostrarToast("error", erroDaResposta(causa).message);
    } finally {
      setProcurandoParecido(false);
    }
  }

  if (criando && criacao) {
    return (
      <CriarExercicio
        nome={criacao.nome}
        parecido={criacao.parecido}
        aoVoltar={aoVoltar}
        aoEscolher={(exercicio) => {
          setEscolhido(exercicio);
          setVersaoDaBusca((n) => n + 1);
          aoVoltar();
        }}
      />
    );
  }

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
      {nomeDigitado && (
        <TextButton
          className="self-start text-left"
          disabled={procurandoParecido}
          onClick={() => void tocarEmCriar()}
        >
          Criar “{nomeDigitado}” como novo exercício
        </TextButton>
      )}
      {escolhido && (
        <FolhaDoExercicio
          key={escolhido.id}
          nome={escolhido.nome}
          medida={escolhido.medida}
          aoFechar={() => setEscolhido(null)}
          aoSalvar={(valores) => aoAdicionar(novoExercicio(escolhido, valores))}
        />
      )}
    </Tela>
  );
}
