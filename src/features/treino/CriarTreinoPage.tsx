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
import { FolhaRemoverFicha } from "./FolhaRemoverFicha";
import {
  criarRascunho,
  fichaMudou,
  letraDaFichaAberta,
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
import type { TreinoParaEditar } from "./treinoParaEditar";
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

// Figma "Editar treino · 4".
const DESCARTAR_EDICAO = {
  titulo: "O treino atual continua como está",
  texto: "As mudanças feitas agora não são salvas.",
};

type CriarTreinoPageProps = {
  aluno: AlunoDoTreino;
  /** O treino ativo a editar (regras 6 e 76); sem ele, cria um novo. */
  treino?: TreinoParaEditar;
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
export function CriarTreinoPage({ aluno, treino, passo, irPara, voltar }: CriarTreinoPageProps) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [inicial] = useState(() => treino?.rascunho ?? criarRascunho(aluno.hoje));
  const [rascunho, setRascunho] = useState(inicial);
  const [dadosConfirmados, setDadosConfirmados] = useState(treino !== undefined);
  /** A cópia da ficha aberta em Editar ficha: só entra no rascunho em "Salvar ficha". */
  const [edicao, setEdicao] = useState<Ficha | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Rascunho | null>(null);
  const [descarte, setDescarte] = useState<"ficha" | "treino" | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const letra = edicao ? letraDaFichaAberta(rascunho, edicao) : "";
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
        p_workout_id: (treino?.id ?? null) as unknown as string,
        p_data: paraSaveWorkout(rascunho),
      });
      if (treino) {
        mostrarToast("success", "Alterações salvas.");
        void navegar({
          to: "/professor/alunos/$alunoId",
          params: { alunoId: aluno.id },
          replace: true,
        });
      } else {
        setSalvo(rascunho);
      }
    } catch (causa) {
      mostrarToast("error", erroDaResposta(causa).message);
    } finally {
      setSalvando(false);
    }
  }

  function removerFichaAberta() {
    if (!edicao) return;
    setRascunho(removerFicha(rascunho, edicao.id));
    setRemovendo(false);
    setEdicao(null);
    voltar();
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
          letra={letra}
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
          letra={letra}
          aoMudar={setEdicao}
          aoVoltar={voltarDaFicha}
          aoAdicionarExercicio={() => irPara("adicionar")}
          aoSalvar={() => {
            setRascunho(salvarFicha(rascunho, edicao));
            voltar();
          }}
          // Ficha já no banco pode ter marcações: pergunta antes (regra 149 (2) vale para a nova).
          aoRemover={() => (edicao.letra ? setRemovendo(true) : removerFichaAberta())}
        />
      );
    }

    return (
      <FichasDoTreino
        rascunho={rascunho}
        textos={
          treino && {
            titulo: "Editar treino",
            apoio: `${aluno.nome} · ${rascunho.nome}. Você altera o treino ativo, sem criar outro.`,
            salvar: "Salvar alterações",
          }
        }
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
        aviso={
          descarte === "ficha" ? DESCARTAR_FICHA : treino ? DESCARTAR_EDICAO : DESCARTAR_TREINO
        }
        aoContinuar={() => setDescarte(null)}
        aoDescartar={descartar}
      />
      <FolhaRemoverFicha
        aberta={removendo}
        letra={letra}
        aoManter={() => setRemovendo(false)}
        aoRemover={removerFichaAberta}
      />
    </>
  );
}
