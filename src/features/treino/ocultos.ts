import { useCallback, useEffect, useRef, useState } from "react";
import { erroDaResposta } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { useToast } from "@/ui";

export type ExercicioOculto = {
  id: string;
  nome: string;
  /** "Pernas · duplicado" (Biblioteca · 4). O do professor segue a regra 151 (2). */
  detalhe: string;
};

/** O servidor não devolve mais que isso por chamada: acima disso, N e a lista param em 100. */
const LIMITE_DA_LISTA = 100;

async function listarOcultos(): Promise<ExercicioOculto[]> {
  const exercicios = await rpc("search_exercises", {
    p_hidden_only: true,
    p_limit: LIMITE_DA_LISTA,
  });
  return exercicios.map((e) => ({
    id: e.id,
    nome: e.name,
    detalhe: `${e.owner_id ? "Seu exercício" : e.muscle_group} · duplicado`,
  }));
}

/**
 * Os exercícios que este professor ocultou da busca (regras 32, 74 e 113). Só mexe na lista dele:
 * fichas e histórico não mudam. `aoMudar` avisa que a busca precisa ser refeita.
 */
export function useOcultos(aoMudar: () => void) {
  const mostrarToast = useToast();
  const [ocultos, setOcultos] = useState<ExercicioOculto[]>([]);
  const [gravando, setGravando] = useState(false);
  const ultimaLeitura = useRef(0);

  const avisarErro = useCallback(
    (causa: unknown) => mostrarToast("error", erroDaResposta(causa).message),
    [mostrarToast],
  );

  const reler = useCallback(async () => {
    const leitura = ++ultimaLeitura.current;
    const lista = await listarOcultos();
    if (leitura === ultimaLeitura.current) setOcultos(lista);
  }, []);

  useEffect(() => {
    reler().catch(avisarErro);
  }, [reler, avisarErro]);

  async function ocultar(id: string) {
    setGravando(true);
    try {
      await rpc("set_exercise_hidden", { p_exercise_id: id, p_hidden: true });
      aoMudar();
      await reler();
    } catch (causa) {
      avisarErro(causa);
    } finally {
      setGravando(false);
    }
  }

  /** Devolve se a lista ficou vazia. */
  async function mostrar(id: string) {
    setGravando(true);
    try {
      await rpc("set_exercise_hidden", { p_exercise_id: id, p_hidden: false });
      ultimaLeitura.current++; // Uma leitura em andamento já está velha.
      const restantes = ocultos.filter((o) => o.id !== id);
      setOcultos(restantes);
      aoMudar();
      return restantes.length === 0;
    } catch (causa) {
      avisarErro(causa);
      return false;
    } finally {
      setGravando(false);
    }
  }

  return { ocultos, gravando, ocultar, mostrar };
}
