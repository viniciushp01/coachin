import { useState } from "react";
import { BackButton, BarraFixa, Button, FormField, Notice, Tela, TextButton } from "@/ui";
import { ListaReordenavel, ReorderRow } from "@/ui/ReorderRow";
import { FolhaDoExercicio } from "./FolhaDoExercicio";
import { linhaDoExercicio } from "./medida";
import {
  letraDaFicha,
  removerExercicio,
  salvarExercicio,
  validarFicha,
  type Ficha,
} from "./rascunho";

type EditarFichaProps = {
  ficha: Ficha;
  indice: number;
  aoMudar: (ficha: Ficha) => void;
  aoVoltar: () => void;
  aoAdicionarExercicio: () => void;
  aoSalvar: () => void;
  aoRemover: () => void;
};

/** Passo 3: nome e exercícios da ficha; "Salvar ficha" não grava o treino (regras 104 e 107). */
export function EditarFicha({
  ficha,
  indice,
  aoMudar,
  aoVoltar,
  aoAdicionarExercicio,
  aoSalvar,
  aoRemover,
}: EditarFichaProps) {
  const [erros, setErros] = useState<ReturnType<typeof validarFicha>>({});
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const aberto = ficha.exercicios.find((e) => e.id === abertoId);

  function salvar() {
    const novos = validarFicha(ficha);
    setErros(novos);
    if (!novos.nome && !novos.semExercicio) aoSalvar();
  }

  return (
    <Tela barra="um">
      <BackButton onClick={aoVoltar} />
      <h1 className="text-title-screen">Ficha {letraDaFicha(indice)}</h1>
      <FormField
        rotulo="Nome da ficha"
        placeholder="Ex.: Peito e tríceps"
        autoComplete="off"
        value={ficha.nome}
        erro={erros.nome}
        onChange={(e) => {
          aoMudar({ ...ficha, nome: e.target.value });
          setErros(({ semExercicio }) => ({ semExercicio }));
        }}
      />
      <h2 className="text-overline text-text-secondary">EXERCÍCIOS</h2>
      {erros.semExercicio && (
        <Notice tom="danger" titulo="Adicione um exercício">
          A ficha precisa de pelo menos um exercício para ser confirmada.
        </Notice>
      )}
      {ficha.exercicios.length > 0 && (
        // Arrastar é do #91: até lá, a linha solta volta para o lugar.
        <ListaReordenavel itens={ficha.exercicios} aoReordenar={() => {}}>
          {(exercicio, posicao) => (
            <ReorderRow
              key={exercicio.id}
              id={exercicio.id}
              indice={posicao}
              titulo={exercicio.nome}
              detalhe={linhaDoExercicio(exercicio)}
              onClick={() => setAbertoId(exercicio.id)}
            />
          )}
        </ListaReordenavel>
      )}
      <Button variante="secondary" onClick={aoAdicionarExercicio}>
        Adicionar exercício
      </Button>
      <TextButton tom="muted" className="self-start" onClick={aoRemover}>
        Remover esta ficha
      </TextButton>
      {aberto && (
        <FolhaDoExercicio
          key={aberto.id}
          nome={aberto.nome}
          medida={aberto.medida}
          inicial={aberto}
          aoFechar={() => setAbertoId(null)}
          aoSalvar={(valores) => {
            aoMudar(salvarExercicio(ficha, { ...aberto, ...valores }));
            setAbertoId(null);
          }}
          aoRemover={() => {
            aoMudar(removerExercicio(ficha, aberto.id));
            setAbertoId(null);
          }}
        />
      )}
      <BarraFixa>
        <Button onClick={salvar}>Salvar ficha</Button>
      </BarraFixa>
    </Tela>
  );
}
