import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { primeiroNome } from "@/lib/listas";
import { rpc } from "@/lib/rpc";
import { useToast } from "@/ui";
import { AdicionarExercicio } from "./AdicionarExercicio";
import type { AlunoDoTreino } from "./alunoDoTreino";
import { lerMedidasDoCatalogo } from "./biblioteca";
import { DadosDoTreino } from "./DadosDoTreino";
import { EditarFicha } from "./EditarFicha";
import { FichasDoTreino } from "./FichasDoTreino";
import { FolhaContinuar } from "./FolhaContinuar";
import { FolhaDescartar } from "./FolhaDescartar";
import { FolhaRemoverFicha } from "./FolhaRemoverFicha";
import type { Medida } from "./medida";
import { AvisoPedidoCancelado } from "./PedidoCancelado";
import { usePedidoCancelado } from "./usePedidoCancelado";
import {
  criarRascunho,
  fichaComMedida,
  fichaMudou,
  letraDaFichaAberta,
  mudou,
  novaFicha,
  paraSaveWorkout,
  rascunhoComMedida,
  removerFicha,
  reordenarFichas,
  salvarExercicio,
  salvarFicha,
  type Ficha,
  type Rascunho,
} from "./rascunho";
import {
  apagarRascunhoGuardado,
  caminhoAte,
  comInicioValido,
  conferirComOCatalogo,
  exerciciosDaMontagem,
  guardarRascunho,
  lerRascunhoGuardado,
  passoParaGuardar,
  textoDoRascunhoGuardado,
  type PassoGuardado,
} from "./rascunhoGuardado";
import type { TreinoParaEditar } from "./treinoParaEditar";
import { TreinoSalvo } from "./TreinoSalvo";

/** As telas cheias do fluxo, que a rota guarda no histórico para o "voltar" do aparelho. */
export type PassoDoTreino =
  "dados" | "fichas" | "ficha" | "adicionar" | "novo-exercicio" | "ajustar-exercicio" | "ocultos";

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
  /** Só em Criar treino e Agendar novo treino: sem isto, nada fica no aparelho (regra 162). */
  guardarNoAparelho?: {
    professorId: string;
    /** Anda pelos passos em ordem, um de cada vez, para o "voltar" seguir o mesmo caminho. */
    abrirCaminho: (passos: PassoGuardado[]) => Promise<void>;
  };
};

/**
 * Criar treino: Dados → Fichas → Editar ficha → Adicionar exercício → Editar exercício (regra 73).
 * Só "Salvar treino" grava no banco, e voltar com alteração pergunta antes (regra 107). Na criação,
 * o rascunho também fica neste aparelho e volta depois de recarregar (regra 162). Figma "Professor
 * · Treino", seções 1, 2, 5, 6, 8 e 11.
 */
export function CriarTreinoPage({
  aluno,
  treino,
  passo,
  irPara,
  voltar,
  guardarNoAparelho,
}: CriarTreinoPageProps) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const professorId = treino ? undefined : guardarNoAparelho?.professorId;
  const [guardado] = useState(() =>
    professorId ? lerRascunhoGuardado(professorId, aluno.id) : null,
  );
  const [inicial, setInicial] = useState(() => treino?.rascunho ?? criarRascunho(aluno.hoje));
  const [rascunho, setRascunho] = useState(() =>
    guardado ? comInicioValido(guardado.rascunho, aluno.hoje) : inicial,
  );
  const [dadosConfirmados, setDadosConfirmados] = useState(treino !== undefined);
  /** A cópia da ficha aberta em Editar ficha: só entra no rascunho em "Salvar ficha". */
  const [edicao, setEdicao] = useState<Ficha | null>(guardado?.edicao ?? null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Rascunho | null>(null);
  const [descarte, setDescarte] = useState<"ficha" | "treino" | null>(null);
  const [removendo, setRemovendo] = useState(false);
  /** Até decidir o que fazer com o rascunho guardado, o que está nele não é alteração nova. */
  const [retomada, setRetomada] = useState<"perguntando" | "conferindo" | "nenhuma">(
    guardado ? "perguntando" : "nenhuma",
  );
  const comecadoEm = useRef(guardado?.comecadoEm ?? null);

  const letra = edicao ? letraDaFichaAberta(rascunho, edicao) : "";
  const editandoFicha = dadosConfirmados && edicao !== null && passo === "ficha";
  const alterouFicha = editandoFicha && fichaMudou(rascunho, edicao);
  const treinoMudou = mudou(inicial, rascunho);
  const temAlteracao = treinoMudou || (edicao !== null && fichaMudou(rascunho, edicao));
  // Pedido aberto ao entrar e cancelado no meio: aviso no topo das fichas (regra 103).
  const pedidoCancelado = usePedidoCancelado(
    aluno.id,
    !treino && aluno.pedidoAberto === true && dadosConfirmados && passo === "fichas",
  );
  const passoAtual = passoParaGuardar({
    passo,
    dadosConfirmados,
    fichaAberta: edicao !== null,
  });

  // A cada mudança, para sobreviver a um recarregar ou ao sistema fechar o app (regra 162).
  useEffect(() => {
    if (!professorId || salvo || retomada !== "nenhuma") return;
    if (!temAlteracao) {
      comecadoEm.current = null;
      apagarRascunhoGuardado(professorId, aluno.id);
      return;
    }
    comecadoEm.current ??= new Date().toISOString();
    guardarRascunho(professorId, aluno.id, {
      comecadoEm: comecadoEm.current,
      passo: passoAtual,
      rascunho,
      // Depois de voltar para Fichas, a cópia aberta já não vale.
      edicao: passoAtual === "ficha" || passoAtual === "adicionar" ? edicao : null,
    });
  }, [professorId, aluno.id, salvo, retomada, temAlteracao, passoAtual, rascunho, edicao]);

  function apagarGuardado() {
    if (professorId) apagarRascunhoGuardado(professorId, aluno.id);
  }

  async function continuarGuardado() {
    if (retomada !== "perguntando" || !guardado || !guardarNoAparelho) return;
    setRetomada("conferindo");
    let montagem = { rascunho, edicao };
    try {
      const catalogo = await lerMedidasDoCatalogo(exerciciosDaMontagem(montagem));
      montagem = conferirComOCatalogo(montagem, catalogo);
    } catch {
      // Sem conexão: segue como guardado. "Salvar treino" é quem confere no servidor.
    }
    setRascunho(montagem.rascunho);
    setEdicao(montagem.edicao);
    setDadosConfirmados(guardado.passo !== "dados");
    try {
      await guardarNoAparelho.abrirCaminho(caminhoAte(guardado.passo));
    } finally {
      setRetomada("nenhuma");
    }
  }

  function comecarDeNovo() {
    apagarGuardado();
    comecadoEm.current = null;
    setRascunho(inicial);
    setEdicao(null);
    setRetomada("nenhuma");
  }

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
    // Recarregar ou fechar a aba com alteração mostra o aviso do navegador (regra 161).
    enableBeforeUnload: () => retomada === "nenhuma" && temAlteracao,
    shouldBlockFn: ({ action, current, next }) => {
      if (action === "PUSH" || action === "REPLACE" || retomada !== "nenhuma") return false;
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
      apagarGuardado();
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
      apagarGuardado();
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

  /** A mudança é na biblioteca, não no treino: também em `inicial`, para não pedir "descartar". */
  function aplicarMedida(exercicioId: string, medida: Medida) {
    setInicial((r) => rascunhoComMedida(r, exercicioId, medida));
    setRascunho((r) => rascunhoComMedida(r, exercicioId, medida));
    setEdicao((f) => f && fichaComMedida(f, exercicioId, medida));
  }

  function abrirFicha(ficha: Ficha) {
    setEdicao(ficha);
    irPara("ficha");
  }

  // Depois de salvo, nem o "voltar" do aparelho reabre o formulário: salvar de novo daria erro.
  if (salvo) return <TreinoSalvo aluno={aluno} rascunho={salvo} aoVoltar={sair} />;

  function telaDoPasso() {
    // Ao recarregar a página, um passo adiante na URL recomeça em Dados (regra 162).
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

    if (
      edicao &&
      (passo === "adicionar" ||
        passo === "novo-exercicio" ||
        passo === "ajustar-exercicio" ||
        passo === "ocultos")
    ) {
      return (
        <AdicionarExercicio
          ficha={edicao}
          letra={letra}
          criando={passo === "novo-exercicio"}
          aoCriar={() => irPara("novo-exercicio")}
          ajustando={passo === "ajustar-exercicio"}
          aoAjustar={() => irPara("ajustar-exercicio")}
          aoMudarMedida={aplicarMedida}
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
        aviso={
          pedidoCancelado && (
            <AvisoPedidoCancelado nome={aluno.nome} telefone={pedidoCancelado.telefone} />
          )
        }
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
      {guardado && (
        <FolhaContinuar
          aberta={retomada === "perguntando"}
          nome={primeiroNome(aluno.nome)}
          texto={textoDoRascunhoGuardado(guardado)}
          aoContinuar={() => void continuarGuardado()}
          aoComecarDeNovo={comecarDeNovo}
        />
      )}
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
