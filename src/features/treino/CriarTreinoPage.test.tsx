// @vitest-environment jsdom
import type { AlunoDoTreino } from "./alunoDoTreino";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp, MENSAGENS } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import type { TreinoParaEditar } from "./treinoParaEditar";
import { CriarTreinoPage, type PassoDoTreino } from "./CriarTreinoPage";
import { FichasDoTreino } from "./FichasDoTreino";
import { criarRascunho, novaFicha, novoExercicio, reordenarFichas, salvarFicha } from "./rascunho";

// Fluxos longos, digitando de verdade: com a máquina ocupada, 5 s não bastam.
vi.setConfig({ testTimeout: 30_000 });

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
  useBlocker: (opcoes: Bloqueio) => {
    bloqueio = opcoes;
  },
}));

// O "voltar" do aparelho passa pelo bloqueio do roteador; a rota real é conferida no navegador.
type Destino = { routeId: string; search: { passo?: PassoDoTreino } };
type Bloqueio = {
  disabled?: boolean;
  shouldBlockFn: (a: { action: string; current: Destino; next: Destino }) => boolean;
};
let bloqueio: Bloqueio;

const ROTA = "/professor_/alunos/$alunoId_/criar-treino";
function voltarDoAparelho(next: Destino, action = "BACK") {
  let bloqueou = false;
  act(() => {
    bloqueou =
      !bloqueio.disabled &&
      bloqueio.shouldBlockFn({ action, current: { routeId: ROTA, search: {} }, next });
  });
  return bloqueou;
}

// O gesto de arrastar não roda no jsdom (sem medidas na tela): os testes soltam a lista já na ordem
// nova, pelo mesmo caminho da biblioteca. O gesto em si é conferido no navegador.
type Lista = { itens: readonly unknown[]; aoReordenar: (itens: unknown[]) => void };
let ultimaLista: Lista;
vi.mock("@/ui/ReorderRow", async (original) => {
  const real = await original<typeof import("@/ui/ReorderRow")>();
  return {
    ...real,
    ListaReordenavel: (props: ComponentProps<typeof real.ListaReordenavel>) => {
      ultimaLista = props as unknown as Lista;
      return <real.ListaReordenavel {...props} />;
    },
  };
});

/** Solta a lista da tela invertida. */
function inverterLista() {
  act(() => ultimaLista.aoReordenar([...ultimaLista.itens].reverse()));
}

const CATALOGO = [
  { id: "ex-supino", name: "Supino reto", measure: "reps", muscle_group: "Peito", owner_id: null },
  {
    id: "ex-prancha",
    name: "Prancha frontal",
    measure: "time",
    muscle_group: "Abdômen",
    owner_id: null,
  },
  { id: "ex-meu", name: "Meu supino", measure: "reps", muscle_group: null, owner_id: "p1" },
];

// O servidor de mentira: busca responde o catálogo menos os ocultos; `save_workout`, o que cada
// teste deixar.
let ocultos: Set<string>;
let salvar: (args: unknown) => unknown;
type ArgsDoRpc = {
  p_hidden_only?: boolean;
  p_exercise_id?: string;
  p_measure?: string;
  p_load_mode?: string;
};
const rpc = vi.fn((funcao: string, args: ArgsDoRpc) =>
  Promise.resolve().then(() => {
    if (funcao === "search_exercises") {
      return CATALOGO.filter((e) => ocultos.has(e.id) === Boolean(args.p_hidden_only));
    }
    if (funcao === "set_exercise_hidden") return void ocultos.add(args.p_exercise_id!);
    if (funcao === "set_exercise_settings") {
      return { measure: args.p_measure, load_mode: args.p_load_mode };
    }
    return salvar(args);
  }),
);
vi.mock("@/lib/rpc", () => ({ rpc: (f: string, a: ArgsDoRpc) => rpc(f, a) }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from() {
      const passo = {
        select: () => passo,
        eq: () => passo,
        in: () => passo,
        is: () => passo,
        then: (ok: (r: unknown) => unknown) =>
          Promise.resolve({
            error: null,
            data: [
              {
                exercise_id: "ex-supino",
                equipment: { name: "Barra reta" },
                workout_days: { workout_id: "w1" },
              },
            ],
          }).then(ok),
      };
      return passo;
    },
  },
}));

// O jsdom não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};
// A biblioteca de arrastar observa a tela e as animações; jsdom não tem nada disso.
document.getAnimations = () => [];
Element.prototype.getAnimations = () => [];
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
}));
class ObservadorInerte {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ObservadorInerte);
vi.stubGlobal("IntersectionObserver", ObservadorInerte);

const JULIANA: AlunoDoTreino = {
  id: "a1",
  nome: "Juliana Costa",
  hoje: "2026-10-29",
  temTreinoAtual: true,
  convite: null,
};

/** Faz o papel da rota: guarda os passos como o histórico do navegador. */
function Caminho({ aluno, treino }: { aluno: AlunoDoTreino; treino?: TreinoParaEditar }) {
  const [pilha, setPilha] = useState<PassoDoTreino[]>([treino ? "fichas" : "dados"]);
  return (
    <CriarTreinoPage
      aluno={aluno}
      treino={treino}
      passo={pilha.at(-1)!}
      irPara={(passo) => setPilha((p) => [...p, passo])}
      voltar={() => setPilha((p) => p.slice(0, -1))}
    />
  );
}

function abrir(aluno = JULIANA) {
  render(
    <ToastProvider>
      <Caminho aluno={aluno} />
    </ToastProvider>,
  );
  return userEvent.setup();
}

const botao = (name: string) => screen.getByRole("button", { name });
/** Linha de lista: o nome acessível é o título seguido do detalhe. */
const comecaCom = (titulo: string) => (nome: string) => nome.startsWith(titulo);
const linha = (titulo: string) => screen.getByRole("button", { name: comecaCom(titulo) });
const chamadasDeSalvar = () => rpc.mock.calls.filter(([f]) => f === "save_workout");
const folhaDescartar = () => screen.getByRole("dialog", { name: "Descartar alterações?" });
const semFolhaDescartar = () =>
  expect(screen.queryByRole("dialog", { name: "Descartar alterações?" })).not.toBeInTheDocument();
const descartar = (u: UserEvent) =>
  u.click(within(folhaDescartar()).getByRole("button", { name: "Descartar alterações" }));
const continuarEditando = (u: UserEvent) =>
  u.click(within(folhaDescartar()).getByRole("button", { name: "Continuar editando" }));
const SAIU = { to: "/professor/alunos/$alunoId", params: { alunoId: "a1" } };

async function irParaFichas(u: UserEvent, nome = "Hipertrofia · Fase 3") {
  await u.type(screen.getByLabelText("Nome do treino"), nome);
  await u.click(botao("Continuar"));
}

async function abrirFichaNova(u: UserEvent, nome: string) {
  await u.click(botao("Adicionar ficha"));
  await u.type(screen.getByLabelText("Nome da ficha"), nome);
}

async function escolherExercicio(u: UserEvent, nome: string) {
  await u.click(botao("Adicionar exercício"));
  await u.click(await screen.findByRole("button", { name: new RegExp(`^${nome}`) }));
  return screen.getByRole("dialog", { name: nome });
}

/** Atalho de descanso (30, 45, 60, 90 ou 120); outro valor passa por "Outro" (regra 159 (4)). */
async function escolherDescanso(u: UserEvent, folha: ReturnType<typeof within>, segundos: string) {
  if (["30", "45", "60", "90", "120"].includes(segundos)) {
    await u.click(folha.getByRole("button", { name: `${segundos} s` }));
    return;
  }
  await u.click(folha.getByRole("button", { name: "Outro" }));
  await u.type(folha.getByLabelText("Descanso, em segundos"), segundos);
}

async function adicionarExercicio(
  u: UserEvent,
  nome: string,
  { series = "4", reps = "10", descanso = "" } = {},
) {
  const folha = await escolherExercicio(u, nome);
  await u.type(within(folha).getByLabelText("Séries"), series);
  const [minimo, maximo] = reps.split("-");
  await u.type(within(folha).getByLabelText(/^(Repetições|Tempo)$/), minimo!);
  if (maximo) {
    await u.click(within(folha).getByRole("button", { name: "Usar faixa" }));
    await u.type(within(folha).getByLabelText(/, máximo$/), maximo);
  }
  if (descanso) await escolherDescanso(u, within(folha), descanso);
  await u.click(within(folha).getByRole("button", { name: "Salvar exercício" }));
}

async function fichaCompleta(u: UserEvent, nome: string) {
  await abrirFichaNova(u, nome);
  await adicionarExercicio(u, "Supino reto", { descanso: "90" });
  await u.click(botao("Salvar ficha"));
}

beforeEach(() => {
  navegar.mockReset();
  rpc.mockClear();
  salvar = () => "w-novo";
  ocultos = new Set();
});
afterEach(cleanup);

describe("Passo na URL e rascunho na memória (regra 107)", () => {
  it.each(["fichas", "ficha", "adicionar", "ajustar-exercicio", "ocultos"] as const)(
    "recarregar em %s perde o rascunho e recomeça em Dados",
    (passo) => {
      render(
        <ToastProvider>
          <CriarTreinoPage aluno={JULIANA} passo={passo} irPara={() => {}} voltar={() => {}} />
        </ToastProvider>,
      );
      expect(screen.getByRole("heading", { name: "Criar treino" })).toBeVisible();
    },
  );
});

describe("Dados (regras 3, 73, 75, 105, 150 e 154)", () => {
  it("mostra os campos do Figma, com início hoje e 8 semanas", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Criar treino" })).toBeVisible();
    expect(screen.getByText("Para Juliana Costa")).toBeVisible();
    expect(screen.getByLabelText("Nome do treino")).toHaveAttribute(
      "placeholder",
      "Ex.: Hipertrofia · Fase 3",
    );
    expect(botao("Início: Hoje · 29/10/2026")).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Número de semanas" })).toHaveValue("8 semanas");
    expect(screen.getByLabelText("Frequência sugerida (opcional)")).toHaveAttribute(
      "placeholder",
      "Ex.: 5x por semana",
    );
    expect(screen.getByText("Termina em 23/12/2026")).toBeVisible();
    expect(
      screen.getByText(
        "O treino dura 8 semanas a partir do início. Fica ativo hoje e o anterior vai para o Histórico.",
      ),
    ).toBeVisible();
  });

  it("sem treino atual, não fala do anterior (regra 150 (1))", () => {
    abrir({ ...JULIANA, temTreinoAtual: false });
    expect(
      screen.getByText("O treino dura 8 semanas a partir do início. Fica ativo hoje."),
    ).toBeVisible();
  });

  it("o fim e o aviso acompanham as semanas, com 1 semana no singular", async () => {
    const u = abrir();
    await u.clear(screen.getByRole("spinbutton", { name: "Número de semanas" }));
    await u.type(screen.getByRole("spinbutton", { name: "Número de semanas" }), "1{Enter}");
    expect(screen.getByText("Termina em 04/11/2026")).toBeVisible();
    expect(screen.getByText(/O treino dura 1 semana a partir do início/)).toBeVisible();
  });

  it("início futuro: fica agendado", async () => {
    const u = abrir();
    await u.click(botao("Início: Hoje · 29/10/2026"));
    await u.click(botao("30 de outubro de 2026"));
    await u.click(botao("Confirmar início"));
    expect(botao("Início: 30/10/2026")).toBeVisible();
    expect(screen.getByText("Termina em 24/12/2026")).toBeVisible();
    expect(
      screen.getByText("Fica agendado. Só você vê até 30/10, e pode alterar ou cancelar antes."),
    ).toBeVisible();
  });

  it("Continuar sempre habilitado: nome vazio dá o erro e não avança (regra 105)", async () => {
    const u = abrir();
    expect(botao("Continuar")).toBeEnabled();
    await u.click(botao("Continuar"));
    expect(screen.getByText("Digite o nome do treino.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Criar treino" })).toBeVisible();
  });

  it("nome só com espaços também dá o erro, que some ao digitar", async () => {
    const u = abrir();
    await u.type(screen.getByLabelText("Nome do treino"), "   ");
    await u.click(botao("Continuar"));
    expect(screen.getByText("Digite o nome do treino.")).toBeVisible();
    await u.type(screen.getByLabelText("Nome do treino"), "A");
    expect(screen.queryByText("Digite o nome do treino.")).not.toBeInTheDocument();
  });

  it("acima de 104 semanas: erro no campo e não avança (regra 154)", async () => {
    const u = abrir();
    await u.type(screen.getByLabelText("Nome do treino"), "Treino");
    await u.clear(screen.getByRole("spinbutton", { name: "Número de semanas" }));
    await u.type(screen.getByRole("spinbutton", { name: "Número de semanas" }), "105");
    await u.click(botao("Continuar"));
    expect(screen.getByText("Use de 1 a 104 semanas.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Criar treino" })).toBeVisible();
  });

  it("voltar sai para a tela do aluno", async () => {
    const u = abrir();
    await u.click(botao("Voltar"));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId",
      params: { alunoId: "a1" },
    });
  });

  it("nome longo do aluno trunca em 1 linha (regra 114)", () => {
    abrir({ ...JULIANA, nome: "Juliana Aparecida de Souza Costa Albuquerque Nogueira" });
    expect(
      screen.getByText("Para Juliana Aparecida de Souza Costa Albuquerque Nogueira"),
    ).toHaveClass("truncate");
  });
});

describe("Fichas (regras 104 e 149 (3))", () => {
  it("mostra o nome e as semanas do treino", async () => {
    const u = abrir();
    await irParaFichas(u);
    expect(screen.getByRole("heading", { name: "Fichas" })).toBeVisible();
    expect(screen.getByText("Hipertrofia · Fase 3 · 8 semanas.")).toBeVisible();
    expect(botao("Salvar treino")).toBeEnabled();
  });

  it("sem ficha: aviso de erro ao salvar, sem gravar", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Salvar treino"));
    expect(screen.getByRole("alert")).toHaveTextContent("Adicione pelo menos uma ficha");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Um treino precisa de ao menos uma ficha, com exercícios, para ser salvo.",
    );
    expect(chamadasDeSalvar()).toEqual([]);
  });
});

describe("Ficha sem exercício: rede de segurança (regras 104 e 156 (2))", () => {
  // O fluxo de criar não deixa chegar aqui: "Salvar ficha" exige exercício. A tela ainda se defende.
  const supino = novoExercicio(
    { id: "ex-supino", nome: "Supino reto", medida: "reps" },
    { series: 4, reps: "10", descanso: 0, observacao: "" },
  );

  function FichasComVazia({ aoSalvar }: { aoSalvar: () => void }) {
    const [rascunho, setRascunho] = useState(() => {
      const base = { ...criarRascunho("2026-10-29"), nome: "Hipertrofia" };
      const comPeito = salvarFicha(base, { ...novaFicha(), nome: "Peito", exercicios: [supino] });
      return salvarFicha(comPeito, novaFicha());
    });
    return (
      <FichasDoTreino
        rascunho={rascunho}
        salvando={false}
        aoVoltar={() => {}}
        aoAbrirFicha={() => {}}
        aoAdicionarFicha={() => {}}
        aoReordenar={(fichas) => setRascunho((r) => reordenarFichas(r, fichas))}
        aoSalvar={aoSalvar}
      />
    );
  }

  it("aponta a letra e destaca a linha, sem salvar", async () => {
    const aoSalvar = vi.fn();
    render(<FichasComVazia aoSalvar={aoSalvar} />);
    expect(linha("Ficha B")).toHaveTextContent("Sem exercícios");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(botao("Salvar treino"));
    expect(screen.getByRole("alert")).toHaveTextContent("Falta exercício na Ficha B");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cada ficha precisa de pelo menos um exercício. Toque nela para adicionar.",
    );
    expect(linha("Ficha B").closest("li")).toHaveClass("border-border-danger");
    expect(linha("Ficha A · Peito").closest("li")).not.toHaveClass("border-border-danger");
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it("o aviso acompanha a letra depois de reordenar", async () => {
    render(<FichasComVazia aoSalvar={() => {}} />);
    await userEvent.click(botao("Salvar treino"));
    expect(screen.getByRole("alert")).toHaveTextContent("Falta exercício na Ficha B");

    inverterLista();
    expect(screen.getByRole("alert")).toHaveTextContent("Falta exercício na Ficha A");
    expect(linha("Ficha A").closest("li")).toHaveClass("border-border-danger");
    expect(linha("Ficha B · Peito").closest("li")).not.toHaveClass("border-border-danger");
  });
});

describe("Editar ficha (regras 104, 107 e 149)", () => {
  it("nova ficha: título com a letra e exercícios em seção", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Adicionar ficha"));
    expect(screen.getByRole("heading", { name: "Ficha A" })).toBeVisible();
    expect(screen.getByLabelText("Nome da ficha")).toHaveAttribute(
      "placeholder",
      "Ex.: Peito e tríceps",
    );
    expect(screen.getByText("EXERCÍCIOS")).toBeVisible();
    expect(botao("Salvar ficha")).toBeEnabled();
  });

  it("sem exercício e sem nome: os erros aparecem ao tocar e a tela fica", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Adicionar ficha"));
    await u.click(botao("Salvar ficha"));
    expect(screen.getByRole("alert")).toHaveTextContent("Adicione um exercício");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A ficha precisa de pelo menos um exercício para ser confirmada.",
    );
    expect(screen.getByText("Digite o nome da ficha.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ficha A" })).toBeVisible();
  });

  it("mostra a linha da regra 149 (5), com e sem descanso", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto", { descanso: "90" });
    await adicionarExercicio(u, "Meu supino", { series: "3", reps: "8-12" });
    expect(linha("Supino reto")).toHaveTextContent("4 séries · 10 reps · descanso 90 s");
    expect(linha("Meu supino")).toHaveTextContent("3 séries · 8-12 reps");
    expect(linha("Meu supino")).not.toHaveTextContent("descanso");
  });

  it("Salvar ficha volta às Fichas sem gravar; o nome digitado sobrevive à busca", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito e tríceps");
    expect(linha("Ficha A · Peito e tríceps")).toBeVisible();
    expect(chamadasDeSalvar()).toEqual([]);
  });

  it("Remover esta ficha, sem aviso; a letra acompanha a posição", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await fichaCompleta(u, "Costas");
    await u.click(linha("Ficha A · Peito"));
    await u.click(botao("Remover esta ficha"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(linha("Ficha A · Costas")).toBeVisible();
    expect(screen.queryByText(/Peito/)).not.toBeInTheDocument();
  });
});

describe("Adicionar exercício (regras 74 e 151 (2))", () => {
  async function abrirBusca(u: UserEvent) {
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito e tríceps");
    await u.click(botao("Adicionar exercício"));
  }

  it("mostra a ficha e os resultados com grupo e equipamento, ou Seu exercício", async () => {
    const u = abrir();
    await abrirBusca(u);
    expect(screen.getByRole("heading", { name: "Adicionar exercício" })).toBeVisible();
    expect(screen.getByText("Ficha A · Peito e tríceps")).toBeVisible();
    expect(await screen.findByRole("button", { name: /^Supino reto/ })).toHaveTextContent(
      "Peito · barra reta",
    );
    expect(linha("Meu supino")).toHaveTextContent("Seu exercício");
    expect(linha("Prancha frontal")).toHaveTextContent("Abdômen");
  });

  it("busca pelo que foi digitado, sem gravar nada", async () => {
    const u = abrir();
    await abrirBusca(u);
    await u.type(screen.getByRole("searchbox", { name: "Buscar exercício" }), "sup");
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("search_exercises", { p_query: "sup" }));
    expect(chamadasDeSalvar()).toEqual([]);
  });

  it("falha na busca vira toast em pt-BR", async () => {
    // A primeira leitura ao abrir é a dos ocultos; a busca vem depois da espera.
    rpc
      .mockImplementationOnce(() => Promise.resolve([]))
      .mockImplementationOnce(() => Promise.reject(new ErroApp("forbidden")));
    const u = abrir();
    await abrirBusca(u);
    expect(await screen.findByText(MENSAGENS.forbidden)).toBeVisible();
  });

  it("ocultar não mexe na ficha: o exercício segue no rascunho e no treino salvo (regra 113)", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto");

    await u.click(botao("Adicionar exercício"));
    await u.click(await screen.findByRole("button", { name: "Opções de Supino reto" }));
    await u.click(botao("Ocultar da busca"));
    expect(await screen.findByRole("button", { name: "Exercícios ocultos (1)" })).toBeVisible();
    await u.click(botao("Voltar"));

    expect(linha("Supino reto")).toBeVisible();
    await u.click(botao("Salvar ficha"));
    await u.click(botao("Salvar treino"));
    await screen.findByRole("heading", { name: "Treino salvo" });
    expect(JSON.stringify(chamadasDeSalvar())).toContain('"exercise_id":"ex-supino"');
  });

  it("o passo de ocultos entra no histórico: voltar cai na busca", async () => {
    ocultos.add("ex-prancha");
    const u = abrir();
    await abrirBusca(u);
    await u.click(await screen.findByRole("button", { name: "Exercícios ocultos (1)" }));
    expect(screen.getByRole("heading", { name: "Exercícios ocultos" })).toBeVisible();

    await u.click(botao("Voltar"));
    expect(screen.getByRole("heading", { name: "Adicionar exercício" })).toBeVisible();
  });

  it("voltar retorna à ficha, sem perder o nome", async () => {
    const u = abrir();
    await abrirBusca(u);
    await u.click(botao("Voltar"));
    expect(screen.getByLabelText("Nome da ficha")).toHaveValue("Peito e tríceps");
  });
});

describe("Editar exercício (regras 124 e 149 (4))", () => {
  async function abrirFolha(u: UserEvent, nome: string) {
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    return escolherExercicio(u, nome);
  }

  it("repetições: campos vazios com os exemplos e sem Remover", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    expect(folha.getByLabelText("Séries")).toHaveValue("");
    expect(folha.getByLabelText("Séries")).toHaveAttribute("placeholder", "Ex.: 4");
    expect(folha.getByLabelText("Repetições")).toHaveAttribute("placeholder", "Ex.: 10");
    expect(folha.getByLabelText("Repetições")).toHaveAttribute("inputmode", "numeric");
    expect(folha.getByLabelText("Séries")).toHaveAttribute("inputmode", "numeric");
    for (const atalho of ["30 s", "45 s", "60 s", "90 s", "120 s", "Outro"]) {
      expect(folha.getByRole("button", { name: atalho })).toHaveAttribute("aria-pressed", "false");
    }
    expect(folha.getByLabelText("Observação (opcional)")).toHaveAttribute(
      "placeholder",
      "Ex.: Controle a descida",
    );
    expect(folha.queryByLabelText("Tempo")).not.toBeInTheDocument();
    expect(folha.queryByRole("button", { name: "Remover exercício" })).not.toBeInTheDocument();
  });

  it("tempo: campo Tempo, com o exemplo 30 s, e 30 aparece como 30 s", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Prancha frontal"));
    expect(folha.getByLabelText("Tempo")).toHaveAttribute("placeholder", "Ex.: 30");
    expect(folha.queryByLabelText("Repetições")).not.toBeInTheDocument();
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("Digite o tempo.")).toBeVisible();

    await u.type(folha.getByLabelText("Séries"), "3");
    await u.type(folha.getByLabelText("Tempo"), "30");
    await escolherDescanso(u, folha, "45");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(linha("Prancha frontal")).toHaveTextContent("3 séries · 30 s · descanso 45 s");
  });

  it("obrigatórios vazios e limites: erro no campo, sem fechar", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("Digite o número de séries (de 1 a 20).")).toBeVisible();
    expect(folha.getByText("Digite as repetições.")).toBeVisible();

    await u.type(folha.getByLabelText("Séries"), "21");
    await u.type(folha.getByLabelText("Repetições"), "10");
    await escolherDescanso(u, folha, "601");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("Digite o número de séries (de 1 a 20).")).toBeVisible();
    expect(folha.getByText("Confira o tempo de descanso.")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Supino reto" })).toBeVisible();
  });

  it("outro formato: texto livre de até 20 caracteres, e voltar para número", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    await u.type(folha.getByLabelText("Repetições"), "12");
    await u.click(folha.getByRole("button", { name: "Outro formato" }));
    const texto = folha.getByLabelText("Repetições");
    expect(texto).toHaveAttribute("maxlength", "20");
    expect(texto).not.toHaveAttribute("inputmode", "numeric");
    expect(texto).toHaveValue("12");
    await u.clear(texto);
    await u.type(texto, "Até a falha");
    expect(folha.queryByRole("button", { name: "Usar faixa" })).not.toBeInTheDocument();
    await u.type(folha.getByLabelText("Séries"), "3");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(linha("Supino reto")).toHaveTextContent("3 séries · Até a falha");

    await u.click(linha("Supino reto"));
    const reaberta = within(screen.getByRole("dialog", { name: "Supino reto" }));
    expect(reaberta.getByLabelText("Repetições")).toHaveValue("Até a falha");
    await u.click(reaberta.getByRole("button", { name: "Voltar para número" }));
    expect(reaberta.getByLabelText("Repetições")).toHaveValue("");
    expect(reaberta.getByLabelText("Repetições")).toHaveAttribute("inputmode", "numeric");
  });

  it("faixa: grava 8-12, erro se o máximo não passa o mínimo e reabre como faixa", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    await u.type(folha.getByLabelText("Séries"), "4");
    await u.type(folha.getByLabelText("Repetições"), "8");
    await u.click(folha.getByRole("button", { name: "Usar faixa" }));
    expect(folha.getByLabelText("Repetições, mínimo")).toHaveValue("8");
    expect(folha.getByLabelText("Repetições, mínimo")).toHaveAttribute("inputmode", "numeric");

    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("O máximo precisa ser maior que o mínimo.")).toBeVisible();
    await u.type(folha.getByLabelText("Repetições, máximo"), "8");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("O máximo precisa ser maior que o mínimo.")).toBeVisible();

    await u.clear(folha.getByLabelText("Repetições, máximo"));
    await u.type(folha.getByLabelText("Repetições, máximo"), "12");
    expect(folha.queryByText("O máximo precisa ser maior que o mínimo.")).not.toBeInTheDocument();
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(linha("Supino reto")).toHaveTextContent("4 séries · 8-12 reps");

    await u.click(linha("Supino reto"));
    const reaberta = within(screen.getByRole("dialog", { name: "Supino reto" }));
    expect(reaberta.getByLabelText("Repetições, mínimo")).toHaveValue("8");
    expect(reaberta.getByLabelText("Repetições, máximo")).toHaveValue("12");
    await u.click(reaberta.getByRole("button", { name: "Número fixo" }));
    expect(reaberta.getByLabelText("Repetições")).toHaveValue("8");
  });

  it("tempo em faixa grava 30-45 s", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Prancha frontal"));
    await u.type(folha.getByLabelText("Séries"), "3");
    await u.click(folha.getByRole("button", { name: "Usar faixa" }));
    await u.type(folha.getByLabelText("Tempo, mínimo"), "30");
    await u.type(folha.getByLabelText("Tempo, máximo"), "45");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(linha("Prancha frontal")).toHaveTextContent("3 séries · 30-45 s");
  });

  it("descanso: um atalho por vez, tocar no escolhido limpa e vazio grava 0", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    const atalho = (nome: string) => folha.getByRole("button", { name: nome });
    await u.click(atalho("60 s"));
    await u.click(atalho("90 s"));
    expect(atalho("60 s")).toHaveAttribute("aria-pressed", "false");
    expect(atalho("90 s")).toHaveAttribute("aria-pressed", "true");
    await u.click(atalho("90 s"));
    expect(atalho("90 s")).toHaveAttribute("aria-pressed", "false");

    await u.type(folha.getByLabelText("Séries"), "3");
    await u.type(folha.getByLabelText("Repetições"), "10");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(linha("Supino reto")).not.toHaveTextContent("descanso");
  });

  it("descanso Outro: campo em segundos; valor de atalho marca o atalho; passou de 600 dá erro", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    await u.click(folha.getByRole("button", { name: "Outro" }));
    expect(folha.getByRole("button", { name: "Outro" })).toHaveAttribute("aria-pressed", "true");
    const campo = folha.getByLabelText("Descanso, em segundos");
    expect(campo).toHaveAttribute("inputmode", "numeric");
    await u.type(campo, "100");
    expect(folha.getByRole("button", { name: "Outro" })).toHaveAttribute("aria-pressed", "true");
    await u.clear(campo);
    await u.type(campo, "60");
    expect(folha.getByRole("button", { name: "60 s" })).toHaveAttribute("aria-pressed", "true");
    expect(folha.getByRole("button", { name: "Outro" })).toHaveAttribute("aria-pressed", "false");

    await u.clear(campo);
    await u.type(campo, "601");
    await u.type(folha.getByLabelText("Séries"), "3");
    await u.type(folha.getByLabelText("Repetições"), "10");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("Confira o tempo de descanso.")).toBeVisible();
  });

  it("reabrir: descanso que não bate com atalho abre Outro com o valor", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto", { descanso: "100" });
    expect(linha("Supino reto")).toHaveTextContent("descanso 100 s");

    await u.click(linha("Supino reto"));
    const folha = within(screen.getByRole("dialog", { name: "Supino reto" }));
    expect(folha.getByRole("button", { name: "Outro" })).toHaveAttribute("aria-pressed", "true");
    expect(folha.getByLabelText("Descanso, em segundos")).toHaveValue("100");
  });

  it("abrir de novo traz os valores, com 90 s; salvar troca e Remover tira, sem confirmar", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto", { descanso: "90" });

    await u.click(linha("Supino reto"));
    const folha = within(screen.getByRole("dialog", { name: "Supino reto" }));
    expect(folha.getByLabelText("Séries")).toHaveValue("4");
    expect(folha.getByLabelText("Repetições")).toHaveValue("10");
    expect(folha.getByRole("button", { name: "90 s" })).toHaveAttribute("aria-pressed", "true");
    await u.clear(folha.getByLabelText("Séries"));
    await u.type(folha.getByLabelText("Séries"), "5");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(linha("Supino reto")).toHaveTextContent("5 séries · 10 reps · descanso 90 s");

    await u.click(linha("Supino reto"));
    await u.click(
      within(screen.getByRole("dialog", { name: "Supino reto" })).getByRole("button", {
        name: "Remover exercício",
      }),
    );
    expect(
      screen.queryByRole("button", { name: comecaCom("Supino reto") }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Reordenar (regras 66, 73 e 149 (3))", () => {
  it("Arraste para reordenar só aparece com ficha", async () => {
    const u = abrir();
    await irParaFichas(u);
    expect(screen.queryByText("Arraste para reordenar.")).not.toBeInTheDocument();
    await fichaCompleta(u, "Peito");
    expect(screen.getByText("Hipertrofia · Fase 3 · 8 semanas.")).toBeVisible();
    expect(screen.getByText("Arraste para reordenar.")).toBeVisible();
  });

  it("nome longo trunca sem levar junto o Arraste para reordenar (regra 114)", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    expect(screen.getByText("Hipertrofia · Fase 3 · 8 semanas.")).toHaveClass("truncate");
    expect(screen.getByText("Arraste para reordenar.")).not.toHaveClass("truncate");
  });

  it("fichas: a letra acompanha a posição e a ordem nova vai em p_data", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await fichaCompleta(u, "Costas");
    inverterLista();
    expect(linha("Ficha A · Costas")).toBeVisible();
    expect(linha("Ficha B · Peito")).toBeVisible();

    await u.click(botao("Salvar treino"));
    await screen.findByRole("heading", { name: "Treino salvo" });
    const [, { p_data }] = chamadasDeSalvar()[0] as [
      string,
      { p_data: { days: { name: string }[] } },
    ];
    expect(p_data.days.map((d) => d.name)).toEqual(["Costas", "Peito"]);
  });

  it("a ficha aberta depois de reordenar mostra a letra nova", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await fichaCompleta(u, "Costas");
    inverterLista();
    await u.click(linha("Ficha A · Costas"));
    expect(screen.getByRole("heading", { name: "Ficha A" })).toBeVisible();
    expect(screen.getByLabelText("Nome da ficha")).toHaveValue("Costas");
  });

  it("exercícios: a ordem nova só vale em Salvar ficha e vai em p_data", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto");
    await adicionarExercicio(u, "Meu supino");
    inverterLista();
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      expect.stringContaining("Meu supino"),
      expect.stringContaining("Supino reto"),
    ]);
    await u.click(botao("Salvar ficha"));
    await u.click(botao("Salvar treino"));
    await screen.findByRole("heading", { name: "Treino salvo" });
    const [, { p_data }] = chamadasDeSalvar()[0] as [
      string,
      { p_data: { days: { exercises: { exercise_id: string }[] }[] } },
    ];
    expect(p_data.days[0]!.exercises.map((e) => e.exercise_id)).toEqual(["ex-meu", "ex-supino"]);
  });
});

describe("Descartar alterações em Dados e Fichas (regra 107)", () => {
  it("Dados sem alteração volta direto", async () => {
    const u = abrir();
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(navegar).toHaveBeenCalledWith(SAIU);
  });

  it("Dados com o texto apagado de novo também volta direto", async () => {
    const u = abrir();
    await u.type(screen.getByLabelText("Nome do treino"), "A");
    await u.clear(screen.getByLabelText("Nome do treino"));
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(navegar).toHaveBeenCalledWith(SAIU);
  });

  it("Dados com alteração: a mesma folha de Fichas", async () => {
    const u = abrir();
    await u.type(screen.getByLabelText("Frequência sugerida (opcional)"), "5x");
    await u.click(botao("Voltar"));
    expect(within(folhaDescartar()).getByText("O treino não será salvo")).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();

    await continuarEditando(u);
    semFolhaDescartar();
    expect(screen.getByLabelText("Frequência sugerida (opcional)")).toHaveValue("5x");

    await u.click(botao("Voltar"));
    await descartar(u);
    expect(navegar).toHaveBeenCalledWith(SAIU);
  });

  it("Fichas: textos e botões do Figma, sem vermelho", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Voltar"));
    const folha = within(folhaDescartar());
    expect(folha.getByRole("heading", { name: "Descartar alterações?" })).toBeVisible();
    expect(folha.getByText("O treino não será salvo")).toBeVisible();
    expect(folha.getByText("Se você sair agora, o que montou até aqui se perde.")).toBeVisible();
    const [principal, contorno] = folha.getAllByRole("button");
    expect(principal).toHaveTextContent("Continuar editando");
    expect(contorno).toHaveTextContent("Descartar alterações");
    expect(contorno).toHaveClass("border-border-default");
    expect(contorno?.className).not.toMatch(/danger/);
  });

  it("Fichas sempre pergunta: o nome digitado em Dados já é alteração", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Voltar"));
    expect(folhaDescartar()).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("depois de Salvar ficha, voltar das Fichas continua perguntando; Continuar mantém tudo", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Voltar"));
    expect(navegar).not.toHaveBeenCalled();

    await continuarEditando(u);
    semFolhaDescartar();
    expect(linha("Ficha A · Peito")).toBeVisible();
  });

  it("Descartar nas Fichas sai do fluxo", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Voltar"));
    await descartar(u);
    expect(navegar).toHaveBeenCalledWith(SAIU);
    expect(chamadasDeSalvar()).toEqual([]);
  });
});

describe("Descartar alterações em Editar ficha (regras 107 e 149 (1))", () => {
  async function abrirFichaSalva(u: UserEvent) {
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(linha("Ficha A · Peito"));
  }

  it("sem alteração, volta direto às Fichas", async () => {
    const u = abrir();
    await abrirFichaSalva(u);
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(screen.getByRole("heading", { name: "Fichas" })).toBeVisible();
  });

  it("com alteração: textos do Figma; Continuar editando mantém o que mudou", async () => {
    const u = abrir();
    await abrirFichaSalva(u);
    await u.type(screen.getByLabelText("Nome da ficha"), " e ombro");
    await u.click(botao("Voltar"));
    const folha = within(folhaDescartar());
    expect(folha.getByText("O que mudou nesta ficha se perde")).toBeVisible();
    expect(
      folha.getByText("Você volta para as fichas do treino e esta ficha fica como estava."),
    ).toBeVisible();

    await continuarEditando(u);
    semFolhaDescartar();
    expect(screen.getByLabelText("Nome da ficha")).toHaveValue("Peito e ombro");
  });

  it("Descartar volta às Fichas com a ficha como estava, mesmo ao reabrir", async () => {
    const u = abrir();
    await abrirFichaSalva(u);
    await u.type(screen.getByLabelText("Nome da ficha"), " e ombro");
    await adicionarExercicio(u, "Meu supino");
    await u.click(botao("Voltar"));
    await descartar(u);

    expect(navegar).not.toHaveBeenCalled();
    expect(linha("Ficha A · Peito")).toHaveTextContent("1 exercício");
    await u.click(linha("Ficha A · Peito"));
    expect(screen.getByLabelText("Nome da ficha")).toHaveValue("Peito");
    expect(screen.queryByRole("button", { name: comecaCom("Meu supino") })).not.toBeInTheDocument();
  });

  it("depois de descartar a ficha, voltar das Fichas ainda pergunta", async () => {
    const u = abrir();
    await abrirFichaSalva(u);
    await u.type(screen.getByLabelText("Nome da ficha"), " e ombro");
    await u.click(botao("Voltar"));
    await descartar(u);
    await u.click(botao("Voltar"));
    expect(within(folhaDescartar()).getByText("O treino não será salvo")).toBeVisible();
  });

  it("ficha nova sem nada digitado volta direto e não deixa linha (regra 156 (2))", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Adicionar ficha"));
    expect(screen.getByRole("heading", { name: "Ficha B" })).toBeVisible();
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("Sem exercícios")).not.toBeInTheDocument();
  });

  it("ficha nova com alteração: pergunta; Descartar some com ela (regra 156 (2))", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto");
    await u.click(botao("Voltar"));
    expect(within(folhaDescartar()).getByText("O que mudou nesta ficha se perde")).toBeVisible();

    await continuarEditando(u);
    expect(screen.getByLabelText("Nome da ficha")).toHaveValue("Peito");
    expect(linha("Supino reto")).toBeVisible();

    await u.click(botao("Voltar"));
    await descartar(u);
    expect(screen.getByRole("heading", { name: "Fichas" })).toBeVisible();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText("Arraste para reordenar.")).not.toBeInTheDocument();

    await u.click(botao("Salvar treino"));
    expect(screen.getByRole("alert")).toHaveTextContent("Adicione pelo menos uma ficha");
  });

  it("ficha nova entra no fim da lista só em Salvar ficha, e a letra segue a posição", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await abrirFichaNova(u, "Costas");
    expect(screen.getByRole("heading", { name: "Ficha B" })).toBeVisible();
    await adicionarExercicio(u, "Meu supino");
    await u.click(botao("Salvar ficha"));
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      expect.stringContaining("Ficha A · Peito"),
      expect.stringContaining("Ficha B · Costas"),
    ]);
  });

  it("Remover esta ficha numa ficha nova volta sem deixar linha", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await u.click(botao("Remover esta ficha"));
    semFolhaDescartar();
    expect(screen.getByRole("heading", { name: "Fichas" })).toBeVisible();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("reordenar exercícios é alteração; voltar à ordem de antes, não", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Supino reto");
    await adicionarExercicio(u, "Meu supino");
    await u.click(botao("Salvar ficha"));
    await u.click(linha("Ficha A · Peito"));

    inverterLista();
    await u.click(botao("Voltar"));
    expect(folhaDescartar()).toBeVisible();
    await continuarEditando(u);

    inverterLista();
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(screen.getByRole("heading", { name: "Fichas" })).toBeVisible();
  });

  it("remover exercício é alteração", async () => {
    const u = abrir();
    await abrirFichaSalva(u);
    await u.click(linha("Supino reto"));
    await u.click(
      within(screen.getByRole("dialog", { name: "Supino reto" })).getByRole("button", {
        name: "Remover exercício",
      }),
    );
    await u.click(botao("Voltar"));
    expect(folhaDescartar()).toBeVisible();
    await descartar(u);
    expect(linha("Ficha A · Peito")).toHaveTextContent("1 exercício");
  });

  it("Salvar ficha e Remover esta ficha não perguntam", async () => {
    const u = abrir();
    await abrirFichaSalva(u);
    await u.type(screen.getByLabelText("Nome da ficha"), " e ombro");
    await u.click(botao("Salvar ficha"));
    semFolhaDescartar();
    expect(linha("Ficha A · Peito e ombro")).toBeVisible();

    await u.click(linha("Ficha A · Peito e ombro"));
    await u.type(screen.getByLabelText("Nome da ficha"), "!");
    await u.click(botao("Remover esta ficha"));
    semFolhaDescartar();
    expect(screen.getByRole("heading", { name: "Fichas" })).toBeVisible();
  });
});

describe("Voltar do aparelho (regra 107)", () => {
  it("Editar ficha com alteração: segura e abre a folha da ficha", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    expect(voltarDoAparelho({ routeId: ROTA, search: { passo: "fichas" } })).toBe(true);
    expect(within(folhaDescartar()).getByText("O que mudou nesta ficha se perde")).toBeVisible();
  });

  it("Editar ficha sem alteração: passa, sem folha", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Adicionar ficha"));
    expect(voltarDoAparelho({ routeId: ROTA, search: { passo: "fichas" } })).toBe(false);
    semFolhaDescartar();
  });

  it("da busca de exercício para a ficha: passa, o que mudou continua lá", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await u.click(botao("Adicionar exercício"));
    expect(voltarDoAparelho({ routeId: ROTA, search: { passo: "ficha" } })).toBe(false);
    semFolhaDescartar();
  });

  it("de Fichas para Dados: passa, porque o rascunho continua na memória", async () => {
    const u = abrir();
    await irParaFichas(u);
    expect(voltarDoAparelho({ routeId: ROTA, search: { passo: "dados" } })).toBe(false);
    semFolhaDescartar();
  });

  it("saindo do fluxo com alteração: segura e abre a folha do treino", async () => {
    const u = abrir();
    await u.type(screen.getByLabelText("Nome do treino"), "A");
    expect(voltarDoAparelho({ routeId: "/outra", search: {} })).toBe(true);
    expect(within(folhaDescartar()).getByText("O treino não será salvo")).toBeVisible();
  });

  it("saindo do fluxo sem alteração: passa", () => {
    abrir();
    expect(voltarDoAparelho({ routeId: "/outra", search: {} })).toBe(false);
    semFolhaDescartar();
  });

  it("navegação do próprio app nunca é segurada", async () => {
    const u = abrir();
    await u.type(screen.getByLabelText("Nome do treino"), "A");
    expect(voltarDoAparelho({ routeId: "/outra", search: {} }, "PUSH")).toBe(false);
    expect(voltarDoAparelho({ routeId: "/outra", search: {} }, "REPLACE")).toBe(false);
    semFolhaDescartar();
  });

  it("depois de salvo, nada é segurado", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Salvar treino"));
    await screen.findByRole("heading", { name: "Treino salvo" });
    expect(voltarDoAparelho({ routeId: "/outra", search: {} })).toBe(false);
    semFolhaDescartar();
  });
});

describe("Aluno que ainda não aceitou o convite (regras 122 e 153)", () => {
  const SEM_ACEITE: AlunoDoTreino = { ...JULIANA, temTreinoAtual: false, convite: "pendente" };

  it("Dados avisa que o treino começa a contar antes do aceite, só com início hoje", async () => {
    const u = abrir(SEM_ACEITE);
    expect(screen.getByText("Juliana ainda não aceitou o convite")).toBeVisible();
    expect(
      screen.getByText("O treino começa a contar na data de início, mesmo antes do aceite."),
    ).toBeVisible();
    await u.click(botao("Início: Hoje · 29/10/2026"));
    await u.click(botao("30 de outubro de 2026"));
    await u.click(botao("Confirmar início"));
    expect(screen.queryByText("Juliana ainda não aceitou o convite")).not.toBeInTheDocument();
  });

  it("convite recusado: o treino fica guardado até um novo convite ser aceito", () => {
    abrir({ ...SEM_ACEITE, convite: "recusado" });
    expect(screen.getByText("Juliana recusou o convite")).toBeVisible();
    expect(
      screen.getByText("O treino fica guardado até um novo convite ser aceito."),
    ).toBeVisible();
  });

  it("aluno com acesso não vê o aviso", () => {
    abrir();
    expect(screen.queryByText(/ainda não aceitou/)).not.toBeInTheDocument();
  });

  it("Treino salvo diz que começa a contar hoje, mesmo antes do aceite", async () => {
    const u = abrir(SEM_ACEITE);
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Salvar treino"));
    expect(
      await screen.findByText(
        "O treino de Juliana já está salvo. Começa a contar hoje, mesmo antes do aceite.",
      ),
    ).toBeVisible();
  });
});

describe("Resultado de Salvar treino (regras 75 e 150)", () => {
  it("início hoje: grava o treino inteiro de uma vez e mostra Treino salvo", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito e tríceps");
    await u.click(botao("Salvar treino"));

    expect(await screen.findByRole("heading", { name: "Treino salvo" })).toBeVisible();
    expect(
      screen.getByText(
        "O treino de Juliana já está ativo. O anterior foi para o Histórico de Juliana.",
      ),
    ).toBeVisible();
    expect(chamadasDeSalvar()).toEqual([
      [
        "save_workout",
        {
          p_student_id: "a1",
          p_workout_id: null,
          p_data: {
            name: "Hipertrofia · Fase 3",
            start_date: "2026-10-29",
            weeks: 8,
            suggested_frequency: null,
            days: [
              {
                id: null,
                name: "Peito e tríceps",
                exercises: [
                  {
                    exercise_id: "ex-supino",
                    sets: 4,
                    reps: "10",
                    rest_seconds: 90,
                    note: null,
                  },
                ],
              },
            ],
          },
        },
      ],
    ]);
  });

  it("sem treino atual: só já está ativo", async () => {
    const u = abrir({ ...JULIANA, temTreinoAtual: false });
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Salvar treino"));
    expect(await screen.findByText("O treino de Juliana já está ativo.")).toBeVisible();
  });

  it("início futuro: Treino agendado, e Voltar ao aluno leva à tela do aluno", async () => {
    const u = abrir();
    await u.click(botao("Início: Hoje · 29/10/2026"));
    await u.click(botao("30 de outubro de 2026"));
    await u.click(botao("Confirmar início"));
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Salvar treino"));

    expect(await screen.findByRole("heading", { name: "Treino agendado" })).toBeVisible();
    expect(
      screen.getByText("Começa em 30/10. Só você vê até lá, e pode alterar ou cancelar antes."),
    ).toBeVisible();
    await u.click(botao("Voltar ao aluno"));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId",
      params: { alunoId: "a1" },
    });
  });

  it("erro da RPC vira toast em pt-BR e o rascunho fica", async () => {
    salvar = () => {
      throw new ErroApp("start_date_taken");
    };
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(botao("Salvar treino"));
    expect(await screen.findByText("Já existe um treino com essa data de início.")).toBeVisible();
    expect(linha("Ficha A · Peito")).toBeVisible();
  });

  it("nada é gravado antes de Salvar treino", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    expect(new Set(rpc.mock.calls.map(([f]) => f))).toEqual(new Set(["search_exercises"]));
  });
});

describe("Editar o treino ativo (regras 6, 76, 111 e 150 (2))", () => {
  const supino = novoExercicio(
    { id: "ex-supino", nome: "Supino reto", medida: "reps" },
    { series: 4, reps: "10", descanso: 90, observacao: "" },
  );
  const treino = (): TreinoParaEditar => ({
    id: "w1",
    rascunho: {
      ...criarRascunho("2026-10-01"),
      nome: "Hipertrofia",
      letrasUsadas: 3,
      fichas: [
        { id: "d-a", letra: "A", nome: "Peito", exercicios: [supino] },
        { id: "d-c", letra: "C", nome: "Pernas", exercicios: [supino] },
      ],
    },
  });

  function abrirEdicao() {
    render(
      <ToastProvider>
        <Caminho aluno={JULIANA} treino={treino()} />
      </ToastProvider>,
    );
    return userEvent.setup();
  }

  it("abre nas fichas, com as letras do banco e os textos de editar", () => {
    abrirEdicao();
    expect(screen.getByRole("heading", { name: "Editar treino" })).toBeVisible();
    expect(
      screen.getByText("Juliana Costa · Hipertrofia. Você altera o treino ativo, sem criar outro."),
    ).toBeVisible();
    expect(linha("Ficha A · Peito")).toBeVisible();
    expect(linha("Ficha C · Pernas")).toBeVisible();
    expect(botao("Salvar alterações")).toBeVisible();
  });

  it("salva o mesmo treino, com início e semanas iguais, e volta com o toast", async () => {
    salvar = () => "w1";
    const u = abrirEdicao();
    await u.click(botao("Salvar alterações"));
    await screen.findByText("Alterações salvas.");
    const args = chamadasDeSalvar()[0]![1] as unknown as {
      p_workout_id: string;
      p_data: { start_date: string; weeks: number; days: { id: string | null }[] };
    };
    expect(args.p_workout_id).toBe("w1");
    expect(args.p_data).toMatchObject({ start_date: "2026-10-01", weeks: 8 });
    expect(args.p_data.days.map((d) => d.id)).toEqual(["d-a", "d-c"]);
    expect(navegar).toHaveBeenCalledWith({ ...SAIU, replace: true });
  });

  it("remover ficha do banco pergunta e só vale ao salvar", async () => {
    salvar = () => "w1";
    const u = abrirEdicao();
    await u.click(linha("Ficha C · Pernas"));
    await u.click(botao("Remover esta ficha"));
    const folha = screen.getByRole("dialog", { name: "Remover a Ficha C?" });
    expect(within(folha).getByText("As marcações antigas continuam")).toBeVisible();

    await u.click(within(folha).getByRole("button", { name: "Manter ficha" }));
    expect(screen.getByRole("heading", { name: "Ficha C" })).toBeVisible();

    await u.click(botao("Remover esta ficha"));
    await u.click(
      within(screen.getByRole("dialog", { name: "Remover a Ficha C?" })).getByRole("button", {
        name: "Remover ficha",
      }),
    );
    expect(screen.queryByRole("button", { name: comecaCom("Ficha C") })).not.toBeInTheDocument();
    expect(chamadasDeSalvar()).toEqual([]);

    await u.click(botao("Salvar alterações"));
    await screen.findByText("Alterações salvas.");
    const args = chamadasDeSalvar()[0]![1] as unknown as { p_data: { days: { id: string }[] } };
    expect(args.p_data.days.map((d) => d.id)).toEqual(["d-a"]);
  });

  it("ficha nova ganha a próxima letra e sai sem perguntar", async () => {
    const u = abrirEdicao();
    await u.click(botao("Adicionar ficha"));
    expect(screen.getByRole("heading", { name: "Ficha D" })).toBeVisible();
    await u.click(botao("Remover esta ficha"));
    expect(screen.queryByRole("dialog", { name: /^Remover/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Editar treino" })).toBeVisible();
  });

  it("remover todas e salvar mostra o erro, sem gravar", async () => {
    const u = abrirEdicao();
    for (const nome of ["Ficha A · Peito", "Ficha C · Pernas"]) {
      await u.click(linha(nome));
      await u.click(botao("Remover esta ficha"));
      await u.click(screen.getByRole("button", { name: "Remover ficha" }));
    }
    await u.click(botao("Salvar alterações"));
    expect(screen.getByText("Adicione pelo menos uma ficha")).toBeVisible();
    expect(chamadasDeSalvar()).toEqual([]);
  });

  it("voltar sem alteração sai direto; com alteração, pergunta com o texto de editar", async () => {
    const u = abrirEdicao();
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(navegar).toHaveBeenCalledWith(SAIU);

    navegar.mockClear();
    await u.click(linha("Ficha A · Peito"));
    await u.type(screen.getByLabelText("Nome da ficha"), " e ombro");
    await u.click(botao("Salvar ficha"));
    await u.click(botao("Voltar"));
    expect(within(folhaDescartar()).getByText("O treino atual continua como está")).toBeVisible();
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe("Ajustar a medida de um exercício que já está na ficha (regras 123 e 124)", () => {
  async function ajustarParaTempo(u: UserEvent) {
    await u.click(botao("Adicionar exercício"));
    await u.click(await screen.findByRole("button", { name: "Opções de Meu supino" }));
    await u.click(botao("Ajustar medida e carga"));
    await screen.findByRole("heading", { name: "Ajustar medida e carga" });
    await u.click(screen.getByRole("radio", { name: "Tempo" }));
    await u.click(botao("Salvar"));
    await screen.findByRole("heading", { name: "Adicionar exercício" });
    await u.click(botao("Voltar"));
  }

  it("a linha e a folha da ficha aberta passam a tempo, e as repetições não mudam", async () => {
    const u = abrir();
    await irParaFichas(u);
    await abrirFichaNova(u, "Peito");
    await adicionarExercicio(u, "Meu supino", { series: "3", reps: "10" });
    expect(linha("Meu supino")).toHaveTextContent("3 séries · 10 reps");

    await ajustarParaTempo(u);

    expect(linha("Meu supino")).toHaveTextContent("3 séries · 10 s");
    await u.click(linha("Meu supino"));
    const folha = screen.getByRole("dialog", { name: "Meu supino" });
    expect(within(folha).getByLabelText("Tempo")).toHaveValue("10");
    await u.click(within(folha).getByRole("button", { name: "Salvar exercício" }));

    await u.click(botao("Salvar ficha"));
    await u.click(botao("Salvar treino"));
    await screen.findByRole("heading", { name: "Treino salvo" });
    expect(JSON.stringify(chamadasDeSalvar())).toContain('"reps":"10"');
  });

  it("não conta como alteração do treino: voltar não pede para descartar", async () => {
    render(
      <ToastProvider>
        <Caminho
          aluno={JULIANA}
          treino={{
            id: "w1",
            rascunho: {
              nome: "Hipertrofia",
              inicio: "2026-10-01",
              semanas: 8,
              frequencia: "",
              letrasUsadas: 1,
              fichas: [
                {
                  id: "d1",
                  letra: "A",
                  nome: "Peito",
                  exercicios: [
                    {
                      id: "l1",
                      exercicioId: "ex-meu",
                      nome: "Meu supino",
                      medida: "reps",
                      series: 3,
                      reps: "10",
                      descanso: 0,
                      observacao: "",
                    },
                  ],
                },
              ],
            },
          }}
        />
      </ToastProvider>,
    );
    const u = userEvent.setup();
    await u.click(linha("Ficha A"));
    await ajustarParaTempo(u);
    expect(linha("Meu supino")).toHaveTextContent("3 séries · 10 s");

    await u.click(botao("Voltar"));
    semFolhaDescartar();
    await screen.findByRole("heading", { name: "Editar treino" });
    await u.click(botao("Voltar"));
    semFolhaDescartar();
    expect(navegar).toHaveBeenCalledWith(SAIU);
  });
});
