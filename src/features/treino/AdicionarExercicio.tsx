import { useEffect, useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { BackButton, SearchField, SectionRow, Tela, TextButton, useToast } from "@/ui";
import { buscarExercicios, type ExercicioDaBusca } from "./biblioteca";
import { ExerciciosOcultosTela } from "./ExerciciosOcultosTela";
import { CriarExercicio } from "./CriarExercicio";
import { procurarParecido, type ExercicioParecido } from "./exercicioNovo";
import { FolhaDoExercicio } from "./FolhaDoExercicio";
import { FolhaOcultar } from "./FolhaOcultar";
import { useOcultos } from "./ocultos";
import { novoExercicio, tituloDaFicha, type ExercicioDoRascunho, type Ficha } from "./rascunho";

const ESPERA_DA_BUSCA_MS = 250;

type AdicionarExercicioProps = {
  ficha: Ficha;
  indice: number;
  /** A tela "Exercícios ocultos": um passo no histórico, sem perder o que foi digitado. */
  emOcultos: boolean;
  aoVerOcultos: () => void;
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
  emOcultos,
  aoVerOcultos,
  criando,
  aoCriar,
  aoVoltar,
  aoAdicionar,
}: AdicionarExercicioProps) {
  const mostrarToast = useToast();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ExercicioDaBusca[]>([]);
  const [escolhido, setEscolhido] = useState<ExercicioDaBusca | null>(null);
  const [paraOcultar, setParaOcultar] = useState<ExercicioDaBusca | null>(null);
  const [criacao, setCriacao] = useState<{
    nome: string;
    parecido: ExercicioParecido | null;
  } | null>(null);
  const [procurandoParecido, setProcurandoParecido] = useState(false);
  /** Muda ao ocultar e ao voltar da criação: a busca precisa ser refeita. */
  const [versaoDaBusca, setVersaoDaBusca] = useState(0);
  const { ocultos, gravando, ocultar, mostrar } = useOcultos(() => setVersaoDaBusca((v) => v + 1));
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

  if (emOcultos) {
    return (
      <ExerciciosOcultosTela
        ocultos={ocultos}
        gravando={gravando}
        aoVoltar={aoVoltar}
        aoDesfazer={(id) =>
          // O último desfeito volta à busca: sem ocultos, não há o que mostrar aqui.
          void mostrar(id).then((ficouVazia) => {
            if (ficouVazia) aoVoltar();
          })
        }
      />
    );
  }

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

  // Some da lista junto com o aumento de N, sem esperar a busca refeita.
  const visiveis = resultados.filter((r) => !ocultos.some((o) => o.id === r.id));

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
        {visiveis.map((exercicio) => (
          <li key={exercicio.id} className="relative">
            <SectionRow
              icone="fitness_center"
              iconeDireita="more_horiz"
              titulo={exercicio.nome}
              detalhe={exercicio.detalhe}
              onClick={() => setEscolhido(exercicio)}
            />
            {/* Um botão não entra em outro: este cobre o "⋯" que a linha desenha por baixo. */}
            <button
              type="button"
              aria-label={`Opções de ${exercicio.nome}`}
              className="absolute inset-y-0 right-0 w-[56px] rounded-tile"
              onClick={() => setParaOcultar(exercicio)}
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
      {ocultos.length > 0 && (
        <TextButton tom="muted" className="self-start" onClick={aoVerOcultos}>
          Exercícios ocultos ({ocultos.length})
        </TextButton>
      )}
      {paraOcultar && (
        <FolhaOcultar
          key={paraOcultar.id}
          nome={paraOcultar.nome}
          gravando={gravando}
          aoFechar={() => setParaOcultar(null)}
          // Fecha só no fim: com a folha aberta, o toast de erro ficaria atrás do escurecimento.
          aoConfirmar={() => void ocultar(paraOcultar.id).finally(() => setParaOcultar(null))}
        />
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
