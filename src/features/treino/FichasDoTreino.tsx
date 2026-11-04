import { useState } from "react";
import { plural } from "@/lib/listas";
import { BackButton, BarraFixa, Button, Notice, Tela } from "@/ui";
import { ListaReordenavel, ReorderRow } from "@/ui/ReorderRow";
import {
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
  salvando: boolean;
  aoVoltar: () => void;
  aoAbrirFicha: (ficha: Ficha) => void;
  aoAdicionarFicha: () => void;
  aoSalvar: () => void;
};

/** Passo 2: as fichas do rascunho e "Salvar treino" (regras 66, 73, 104 e 149 (3)). */
export function FichasDoTreino({
  rascunho,
  salvando,
  aoVoltar,
  aoAbrirFicha,
  aoAdicionarFicha,
  aoSalvar,
}: FichasDoTreinoProps) {
  const [erro, setErro] = useState<ErroDoTreino | null>(null);
  const comProblema = erro?.tipo === "ficha_sem_exercicio" ? erro.fichas : [];

  function salvar() {
    const erroNovo = validarTreino(rascunho);
    setErro(erroNovo);
    if (!erroNovo) aoSalvar();
  }

  return (
    <Tela barra="um">
      <BackButton onClick={aoVoltar} />
      <div className="flex flex-col gap-8">
        <h1 className="text-title-screen">Fichas</h1>
        <p className="truncate text-body text-text-secondary">
          {rascunho.nome.trim()} · {plural(rascunho.semanas, "semana", "semanas")}.
        </p>
      </div>
      {erro && <AvisoDoTreino erro={erro} />}
      {rascunho.fichas.length > 0 && (
        // Arrastar é do #91: até lá, a linha solta volta para o lugar.
        <ListaReordenavel itens={rascunho.fichas} aoReordenar={() => {}}>
          {(ficha, indice) => (
            <ReorderRow
              key={ficha.id}
              id={ficha.id}
              indice={indice}
              titulo={tituloDaFicha(ficha, indice)}
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
          Salvar treino
        </Button>
      </BarraFixa>
    </Tela>
  );
}
