// O rascunho da criação de treino guardado neste aparelho (regra 162): nada vai ao servidor antes de
// "Salvar treino". Em localStorage: é pequeno, e a leitura síncrona abre "Dados" já preenchido.
// Uma chave por professor e aluno, e sair da conta não apaga (outro professor não lê a chave alheia).
import { z } from "zod";
import { plural } from "@/lib/listas";
import { fichaComMedida, fichaMudou, salvarFicha, type Ficha, type Rascunho } from "./rascunho";
import type { Medida } from "./medida";

const VERSAO = 1;
const PREFIXO = "coachin:rascunho-treino:";
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

const esquemaDaFicha = z.object({
  id: z.string(),
  letra: z.string().optional(),
  nome: z.string(),
  exercicios: z.array(
    z.object({
      id: z.string(),
      exercicioId: z.string(),
      nome: z.string(),
      medida: z.enum(["reps", "time"]),
      series: z.number(),
      reps: z.string(),
      descanso: z.number(),
      observacao: z.string(),
    }),
  ),
});

const esquema = z.object({
  versao: z.literal(VERSAO),
  comecadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  passo: z.enum(["dados", "fichas", "ficha", "adicionar"]),
  rascunho: z.object({
    nome: z.string(),
    inicio: z.string(),
    semanas: z.number(),
    frequencia: z.string(),
    letrasUsadas: z.number(),
    fichas: z.array(esquemaDaFicha),
  }),
  edicao: esquemaDaFicha.nullable(),
});

export type PassoGuardado = z.infer<typeof esquema>["passo"];
export type RascunhoGuardado = {
  comecadoEm: string;
  passo: PassoGuardado;
  rascunho: Rascunho;
  edicao: Ficha | null;
};

const chave = (contaId: string, alunoId: string) => `${PREFIXO}${contaId}:${alunoId}`;

function apagarChave(nome: string) {
  try {
    localStorage.removeItem(nome);
  } catch {
    // Sem armazenamento (janela privada): não há o que apagar.
  }
}

/** O rascunho válido da chave; vencido ou de um formato antigo é apagado e não volta. */
function lerChave(nome: string, agora: Date): RascunhoGuardado | null {
  let texto: string | null;
  try {
    texto = localStorage.getItem(nome);
  } catch {
    return null;
  }
  if (texto === null) return null;
  let bruto: unknown = null;
  try {
    bruto = JSON.parse(texto);
  } catch {
    // Cai no apagar, abaixo.
  }
  const lido = esquema.safeParse(bruto);
  if (!lido.success || agora.getTime() - Date.parse(lido.data.atualizadoEm) > VALIDADE_MS) {
    apagarChave(nome);
    return null;
  }
  const { comecadoEm, passo, rascunho, edicao } = lido.data;
  return { comecadoEm, passo, rascunho, edicao };
}

export function lerRascunhoGuardado(contaId: string, alunoId: string, agora = new Date()) {
  return lerChave(chave(contaId, alunoId), agora);
}

export function guardarRascunho(
  contaId: string,
  alunoId: string,
  dados: RascunhoGuardado,
  agora = new Date(),
) {
  try {
    localStorage.setItem(
      chave(contaId, alunoId),
      JSON.stringify({ versao: VERSAO, atualizadoEm: agora.toISOString(), ...dados }),
    );
  } catch {
    // Sem armazenamento ou sem espaço: a montagem segue, só sem a proteção contra recarregar.
  }
}

export function apagarRascunhoGuardado(contaId: string, alunoId: string) {
  apagarChave(chave(contaId, alunoId));
}

/**
 * Passa pelos rascunhos da conta: apaga os vencidos e os dos alunos que `manter` recusa. A Lista de
 * alunos usa para quem deixou de ser deste professor; a exclusão de conta (fatia 9) apaga todos.
 */
export function limparRascunhos(
  contaId: string,
  manter: (alunoId: string) => boolean,
  agora = new Date(),
) {
  const prefixo = `${PREFIXO}${contaId}:`;
  try {
    const nomes = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const nome of nomes) {
      if (!nome?.startsWith(prefixo)) continue;
      if (manter(nome.slice(prefixo.length))) lerChave(nome, agora);
      else apagarChave(nome);
    }
  } catch {
    // Sem armazenamento: não há o que limpar.
  }
}

// Passos ----------------------------------------------------------------------------------------

/**
 * O passo a guardar. As telas de dentro de Adicionar exercício dependem do que só existe na memória
 * delas (o exercício em ajuste, o nome digitado): voltam para a busca.
 */
export function passoParaGuardar({
  passo,
  dadosConfirmados,
  fichaAberta,
}: {
  passo: string;
  dadosConfirmados: boolean;
  fichaAberta: boolean;
}): PassoGuardado {
  if (!dadosConfirmados || passo === "dados") return "dados";
  if (!fichaAberta || passo === "fichas") return "fichas";
  return passo === "ficha" ? "ficha" : "adicionar";
}

/** Os passos a percorrer ao continuar, para o "voltar" andar um por vez, como na montagem. */
export function caminhoAte(passo: PassoGuardado): PassoGuardado[] {
  const caminho: PassoGuardado[] = ["fichas", "ficha", "adicionar"];
  return passo === "dados" ? ["dados"] : caminho.slice(0, caminho.indexOf(passo) + 1);
}

// Validar ao continuar --------------------------------------------------------------------------

/** Início passado vira hoje (regra 3). */
export function comInicioValido(rascunho: Rascunho, hoje: string): Rascunho {
  return rascunho.inicio < hoje ? { ...rascunho, inicio: hoje } : rascunho;
}

type Montagem = Pick<RascunhoGuardado, "rascunho" | "edicao">;

/** Os exercícios do catálogo usados na montagem, sem repetir. */
export function exerciciosDaMontagem({ rascunho, edicao }: Montagem) {
  const fichas = edicao ? [...rascunho.fichas, edicao] : rascunho.fichas;
  return [...new Set(fichas.flatMap((f) => f.exercicios.map((e) => e.exercicioId)))];
}

/** A medida vem do catálogo de agora; exercício que não existe mais sai da ficha. */
export function conferirComOCatalogo(
  { rascunho, edicao }: Montagem,
  catalogo: ReadonlyMap<string, Medida>,
): Montagem {
  const conferir = (ficha: Ficha): Ficha => {
    const restantes = {
      ...ficha,
      exercicios: ficha.exercicios.filter((e) => catalogo.has(e.exercicioId)),
    };
    return restantes.exercicios.reduce(
      (f, e) => fichaComMedida(f, e.exercicioId, catalogo.get(e.exercicioId)!),
      restantes,
    );
  };
  return {
    rascunho: { ...rascunho, fichas: rascunho.fichas.map(conferir) },
    edicao: edicao && conferir(edicao),
  };
}

// Texto da folha --------------------------------------------------------------------------------

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "Você começou em 06/11, às 15:42. Tem 2 fichas e 9 exercícios. Fica guardado só neste aparelho." */
export function textoDoRascunhoGuardado({ comecadoEm, rascunho, edicao }: RascunhoGuardado) {
  const inicio = new Date(comecadoEm);
  const dia = `${doisDigitos(inicio.getDate())}/${doisDigitos(inicio.getMonth() + 1)}`;
  const hora = `${doisDigitos(inicio.getHours())}:${doisDigitos(inicio.getMinutes())}`;
  // A ficha aberta conta como está na tela; ainda vazia, não conta.
  const { fichas } =
    edicao && fichaMudou(rascunho, edicao) ? salvarFicha(rascunho, edicao) : rascunho;
  const exercicios = fichas.reduce((total, f) => total + f.exercicios.length, 0);
  return (
    `Você começou em ${dia}, às ${hora}. ` +
    `Tem ${plural(fichas.length, "ficha", "fichas")} e ${plural(exercicios, "exercício", "exercícios")}. ` +
    "Fica guardado só neste aparelho."
  );
}
