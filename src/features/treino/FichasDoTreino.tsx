import { useState } from "react";
import { plural } from "@/lib/listas";
import { BackButton, BarraFixa, Button, Notice, Tela } from "@/ui";
import { ListaReordenavel, ReorderRow } from "@/ui/ReorderRow";
import {
  letrasDasFichas,
  tituloDaFicha,
  validarTreino,
  type ErroDoTreino,
  type Ficha,
  type Rascunho,
} from "./rascunho";

/** Avisos de "Salvar treino" (regra 104; Figma "Criar treino · 10 e 11"). */
function AvisoDoTreino({ erro }: { erro: ErroDoTreino }) {
  return erro.tipo === "sem_ficha" ? (
    <Notice tom="danger" titulo="Adicione pelo menos uma ficha">
      Um treino precisa de ao menos uma ficha, com exercícios, para ser salvo.
    </Notice>
  ) : (
    <Notice tom="danger" titulo={`Falta exercício na Ficha ${erro.letra}`}>
      Cada ficha precisa de pelo menos um exercício. Toque nela para adicionar.
    </Notice>
  );
}

type FichasDoTreinoProps = {
  rascunho: Rascunho;
  /** Quando editando o treino ativo; sem isto, os textos de criar. */
  textos?: { titulo: string; apoio: string; salvar: string };
  salvando: boolean;
  aoVoltar: () => void;
  aoAbrirFicha: (ficha: Ficha) => void;
  aoAdicionarFicha: () => void;
  aoReordenar: (fichas: Ficha[]) => void;
  aoSalvar: () => void;
};

/** Passo 2: as fichas do rascunho e "Salvar treino" (regras 66, 73, 104 e 149 (3)). */
export function FichasDoTreino({
  rascunho,
  textos,
  salvando,
  aoVoltar,
  aoAbrirFicha,
  aoAdicionarFicha,
  aoReordenar,
  aoSalvar,
}: FichasDoTreinoProps) {
  const [tentouSalvar, setTentouSalvar] = useState(false);
  // Calculado a cada tela: reordenar muda a letra que o aviso cita.
  const erro = tentouSalvar ? validarTreino(rascunho) : null;
  const comProblema = erro?.tipo === "ficha_sem_exercicio" ? erro.fichas : [];
  const temFicha = rascunho.fichas.length > 0;
  const letras = letrasDasFichas(rascunho);

  function salvar() {
    setTentouSalvar(true);
    if (!validarTreino(rascunho)) aoSalvar();
  }

  return (
    <Tela barra="um">
      <BackButton onClick={aoVoltar} />
      <div className="flex flex-col gap-8">
        <h1 className="text-title-screen">{textos?.titulo ?? "Fichas"}</h1>
        {/* Em blocos: o nome longo trunca (regra 114) sem cortar a instrução. */}
        <div className="text-body text-text-secondary">
          {textos ? (
            <p>{textos.apoio}</p>
          ) : (
            <p className="truncate">
              {rascunho.nome.trim()} · {plural(rascunho.semanas, "semana", "semanas")}.
            </p>
          )}
          {temFicha && <p>Arraste para reordenar.</p>}
        </div>
      </div>
      {erro && <AvisoDoTreino erro={erro} />}
      {temFicha && (
        <ListaReordenavel itens={rascunho.fichas} aoReordenar={aoReordenar}>
          {(ficha, indice) => (
            <ReorderRow
              key={ficha.id}
              id={ficha.id}
              indice={indice}
              titulo={tituloDaFicha(ficha, letras[indice]!)}
              detalhe={
                ficha.exercicios.length > 0
                  ? plural(ficha.exercicios.length, "exercício", "exercícios")
                  : "Sem exercícios"
              }
              comProblema={comProblema.includes(ficha.id)}
              onClick={() => aoAbrirFicha(ficha)}
            />
          )}
        </ListaReordenavel>
      )}
      <Button variante="secondary" onClick={aoAdicionarFicha}>
        Adicionar ficha
      </Button>
      <BarraFixa>
        <Button disabled={salvando} onClick={salvar}>
          {textos?.salvar ?? "Salvar treino"}
        </Button>
      </BarraFixa>
    </Tela>
  );
}
