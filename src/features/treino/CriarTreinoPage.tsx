import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { useToast } from "@/ui";
import { AdicionarExercicio } from "./AdicionarExercicio";
import type { AlunoDoTreino } from "./alunoDoTreino";
import { DadosDoTreino } from "./DadosDoTreino";
import { EditarFicha } from "./EditarFicha";
import { FichasDoTreino } from "./FichasDoTreino";
import {
  adicionarFicha,
  criarRascunho,
  paraSaveWorkout,
  removerFicha,
  salvarExercicio,
  salvarFicha,
  type Ficha,
  type Rascunho,
} from "./rascunho";
import { TreinoSalvo } from "./TreinoSalvo";

/** As telas cheias do fluxo, que a rota guarda no histórico para o "voltar" do aparelho. */
export type PassoDoTreino = "dados" | "fichas" | "ficha" | "adicionar" | "novo-exercicio";

type CriarTreinoPageProps = {
  aluno: AlunoDoTreino;
  passo: PassoDoTreino;
  irPara: (passo: PassoDoTreino) => void;
  /** Volta um passo no histórico. */
  voltar: () => void;
};

/**
 * Criar treino: Dados → Fichas → Editar ficha → Adicionar exercício → Editar exercício (regra 73).
 * O rascunho só existe aqui, na memória: sair ou recarregar descarta, e só "Salvar treino" grava
 * (regra 107). Figma "Professor · Treino", seções 1, 2, 5, 6 e 8.
 */
export function CriarTreinoPage({ aluno, passo, irPara, voltar }: CriarTreinoPageProps) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [rascunho, setRascunho] = useState(() => criarRascunho(aluno.hoje));
  const [dadosConfirmados, setDadosConfirmados] = useState(false);
  /** A cópia da ficha aberta em Editar ficha: só entra no rascunho em "Salvar ficha". */
  const [edicao, setEdicao] = useState<Ficha | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Rascunho | null>(null);

  const sair = () =>
    void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: aluno.id } });

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

  function criarFicha() {
    const novo = adicionarFicha(rascunho);
    setRascunho(novo);
    abrirFicha(novo.fichas.at(-1)!);
  }

  // Depois de salvo, nem o "voltar" do aparelho reabre o formulário: salvar de novo daria erro.
  if (salvo) return <TreinoSalvo aluno={aluno} rascunho={salvo} aoVoltar={sair} />;

  // Ao recarregar a página, o rascunho se perde: um passo adiante na URL recomeça em Dados.
  if (!dadosConfirmados || passo === "dados") {
    return (
      <DadosDoTreino
        aluno={aluno}
        rascunho={rascunho}
        aoMudar={(mudanca) => setRascunho((r) => ({ ...r, ...mudanca }))}
        aoVoltar={sair}
        aoContinuar={() => {
          setDadosConfirmados(true);
          irPara("fichas");
        }}
      />
    );
  }

  const indice = edicao ? rascunho.fichas.findIndex((f) => f.id === edicao.id) : -1;

  if (edicao && indice >= 0 && (passo === "adicionar" || passo === "novo-exercicio")) {
    return (
      <AdicionarExercicio
        ficha={edicao}
        indice={indice}
        criando={passo === "novo-exercicio"}
        aoCriar={() => irPara("novo-exercicio")}
        aoVoltar={voltar}
        aoAdicionar={(exercicio) => {
          setEdicao(salvarExercicio(edicao, exercicio));
          voltar();
        }}
      />
    );
  }

  if (edicao && indice >= 0 && passo === "ficha") {
    return (
      <EditarFicha
        ficha={edicao}
        indice={indice}
        aoMudar={setEdicao}
        aoVoltar={voltar}
        aoAdicionarExercicio={() => irPara("adicionar")}
        aoSalvar={() => {
          setRascunho(salvarFicha(rascunho, edicao));
          voltar();
        }}
        aoRemover={() => {
          setRascunho(removerFicha(rascunho, edicao.id));
          voltar();
        }}
      />
    );
  }

  return (
    <FichasDoTreino
      rascunho={rascunho}
      salvando={salvando}
      aoVoltar={sair}
      aoAbrirFicha={abrirFicha}
      aoAdicionarFicha={criarFicha}
      aoSalvar={() => void salvarTreino()}
    />
  );
}
