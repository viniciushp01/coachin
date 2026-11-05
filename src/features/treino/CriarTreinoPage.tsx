import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { useToast } from "@/ui";
import { AdicionarExercicio } from "./AdicionarExercicio";
import type { AlunoDoTreino } from "./alunoDoTreino";
import { DadosDoTreino } from "./DadosDoTreino";
import { EditarFicha } from "./EditarFicha";
import { FichasDoTreino } from "./FichasDoTreino";
import { FolhaDescartar } from "./FolhaDescartar";
import {
  criarRascunho,
  fichaMudou,
  mudou,
  novaFicha,
  paraSaveWorkout,
  removerFicha,
  reordenarFichas,
  salvarExercicio,
  salvarFicha,
  type Ficha,
  type Rascunho,
} from "./rascunho";
import { TreinoSalvo } from "./TreinoSalvo";

/** As telas cheias do fluxo, que a rota guarda no histórico para o "voltar" do aparelho. */
export type PassoDoTreino =
  "dados" | "fichas" | "ficha" | "adicionar" | "novo-exercicio" | "ocultos";

// Figma "Criar treino · 13 e 14". Dados usa a mesma folha de Fichas (regra 107).
const DESCARTAR_FICHA = {
  titulo: "O que mudou nesta ficha se perde",
  texto: "Você volta para as fichas do treino e esta ficha fica como estava.",
};
const DESCARTAR_TREINO = {
  titulo: "O treino não será salvo",
  texto: "Se você sair agora, o que montou até aqui se perde.",
};

type CriarTreinoPageProps = {
  aluno: AlunoDoTreino;
  passo: PassoDoTreino;
  irPara: (passo: PassoDoTreino) => void;
  /** Volta um passo no histórico, sem passar pela pergunta de descartar. */
  voltar: () => void;
};

/**
 * Criar treino: Dados → Fichas → Editar ficha → Adicionar exercício → Editar exercício (regra 73).
 * O rascunho só existe aqui, na memória: só "Salvar treino" grava, e voltar com alteração pergunta
 * antes (regra 107). Figma "Professor · Treino", seções 1, 2, 5, 6 e 8.
 */
export function CriarTreinoPage({ aluno, passo, irPara, voltar }: CriarTreinoPageProps) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [inicial] = useState(() => criarRascunho(aluno.hoje));
  const [rascunho, setRascunho] = useState(inicial);
  const [dadosConfirmados, setDadosConfirmados] = useState(false);
  /** A cópia da ficha aberta em Editar ficha: só entra no rascunho em "Salvar ficha". */
  const [edicao, setEdicao] = useState<Ficha | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Rascunho | null>(null);
  const [descarte, setDescarte] = useState<"ficha" | "treino" | null>(null);

  // A ficha nova ainda não está no rascunho: a posição dela é depois da última.
  const salvaEm = edicao ? rascunho.fichas.findIndex((f) => f.id === edicao.id) : -1;
  const indice = salvaEm >= 0 ? salvaEm : rascunho.fichas.length;
  const editandoFicha = dadosConfirmados && edicao !== null && passo === "ficha";
  const alterouFicha = editandoFicha && fichaMudou(rascunho, edicao);
  const treinoMudou = mudou(inicial, rascunho);

  const sair = () =>
    void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: aluno.id } });

  function voltarDaFicha() {
    if (alterouFicha) setDescarte("ficha");
    else voltar();
  }

  function sairDoFluxo() {
    if (treinoMudou) setDescarte("treino");
    else sair();
  }

  // O "voltar" do aparelho faz a mesma pergunta (regra 156 (1)). Os botões da tela não passam aqui.
  useBlocker({
    disabled: salvo !== null,
    enableBeforeUnload: false,
    shouldBlockFn: ({ action, current, next }) => {
      if (action === "PUSH" || action === "REPLACE") return false;
      if (alterouFicha && (next.search as { passo?: PassoDoTreino }).passo !== "adicionar") {
        setDescarte("ficha");
        return true;
      }
      if (treinoMudou && next.routeId !== current.routeId) {
        setDescarte("treino");
        return true;
      }
      return false;
    },
  });

  function descartar() {
    const eraFicha = descarte === "ficha";
    setDescarte(null);
    if (eraFicha) {
      setEdicao(null);
      voltar();
    } else {
      sair();
    }
  }

  async function salvarTreino() {
    setSalvando(true);
    try {
      await rpc("save_workout", {
        p_student_id: aluno.id,
        // Nulo cria o treino; os tipos gerados não sabem que o parâmetro aceita nulo.
        p_workout_id: null as unknown as string,
        p_data: paraSaveWorkout(rascunho),
      });
      setSalvo(rascunho);
    } catch (causa) {
      mostrarToast("error", erroDaResposta(causa).message);
    } finally {
      setSalvando(false);
    }
  }

  function abrirFicha(ficha: Ficha) {
    setEdicao(ficha);
    irPara("ficha");
  }

  // Depois de salvo, nem o "voltar" do aparelho reabre o formulário: salvar de novo daria erro.
  if (salvo) return <TreinoSalvo aluno={aluno} rascunho={salvo} aoVoltar={sair} />;

  function telaDoPasso() {
    // Ao recarregar a página, o rascunho se perde: um passo adiante na URL recomeça em Dados.
    if (!dadosConfirmados || passo === "dados") {
      return (
        <DadosDoTreino
          aluno={aluno}
          rascunho={rascunho}
          aoMudar={(mudanca) => setRascunho((r) => ({ ...r, ...mudanca }))}
          aoVoltar={sairDoFluxo}
          aoContinuar={() => {
            setDadosConfirmados(true);
            irPara("fichas");
          }}
        />
      );
    }

    if (edicao && (passo === "adicionar" || passo === "novo-exercicio" || passo === "ocultos")) {
      return (
        <AdicionarExercicio
          ficha={edicao}
          indice={indice}
          criando={passo === "novo-exercicio"}
          aoCriar={() => irPara("novo-exercicio")}
          emOcultos={passo === "ocultos"}
          aoVerOcultos={() => irPara("ocultos")}
          aoVoltar={voltar}
          aoAdicionar={(exercicio) => {
            setEdicao(salvarExercicio(edicao, exercicio));
            voltar();
          }}
        />
      );
    }

    if (edicao && editandoFicha) {
      return (
        <EditarFicha
          ficha={edicao}
          indice={indice}
          aoMudar={setEdicao}
          aoVoltar={voltarDaFicha}
          aoAdicionarExercicio={() => irPara("adicionar")}
          aoSalvar={() => {
            setRascunho(salvarFicha(rascunho, edicao));
            voltar();
          }}
          aoRemover={() => {
            setRascunho(removerFicha(rascunho, edicao.id));
            setEdicao(null);
            voltar();
          }}
        />
      );
    }

    return (
      <FichasDoTreino
        rascunho={rascunho}
        salvando={salvando}
        aoVoltar={sairDoFluxo}
        aoAbrirFicha={abrirFicha}
        aoAdicionarFicha={() => abrirFicha(novaFicha())}
        aoReordenar={(fichas) => setRascunho((r) => reordenarFichas(r, fichas))}
        aoSalvar={() => void salvarTreino()}
      />
    );
  }

  return (
    <>
      {telaDoPasso()}
      <FolhaDescartar
        aberta={descarte !== null}
        aviso={descarte === "ficha" ? DESCARTAR_FICHA : DESCARTAR_TREINO}
        aoContinuar={() => setDescarte(null)}
        aoDescartar={descartar}
      />
    </>
  );
}
