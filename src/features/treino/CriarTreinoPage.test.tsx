// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp, MENSAGENS } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { CriarTreinoPage, type PassoDoTreino } from "./CriarTreinoPage";

const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

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

// O servidor de mentira: busca responde o catálogo; `save_workout`, o que cada teste deixar.
let salvar: (args: unknown) => unknown;
const rpc = vi.fn((funcao: string, args: unknown) =>
  Promise.resolve().then(() => (funcao === "search_exercises" ? CATALOGO : salvar(args))),
);
vi.mock("@/lib/rpc", () => ({ rpc: (f: string, a: unknown) => rpc(f, a) }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from() {
      const passo = {
        select: () => passo,
        eq: () => passo,
        in: () => passo,
        then: (ok: (r: unknown) => unknown) =>
          Promise.resolve({
            error: null,
            data: [{ exercise_id: "ex-supino", equipment: { name: "Barra reta" } }],
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

const JULIANA = {
  id: "a1",
  nome: "Juliana Costa",
  hoje: "2026-10-29",
  temTreinoAtual: true,
};

/** Faz o papel da rota: guarda os passos como o histórico do navegador. */
function Caminho({ aluno }: { aluno: typeof JULIANA }) {
  const [pilha, setPilha] = useState<PassoDoTreino[]>(["dados"]);
  return (
    <CriarTreinoPage
      aluno={aluno}
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

async function irParaFichas(u: UserEvent, nome = "Hipertrofia · Fase 3") {
  await u.type(screen.getByLabelText("Nome do treino"), nome);
  await u.click(botao("Continuar"));
}

async function novaFicha(u: UserEvent, nome: string) {
  await u.click(botao("Adicionar ficha"));
  await u.type(screen.getByLabelText("Nome da ficha"), nome);
}

async function escolherExercicio(u: UserEvent, nome: string) {
  await u.click(botao("Adicionar exercício"));
  await u.click(await screen.findByRole("button", { name: new RegExp(`^${nome}`) }));
  return screen.getByRole("dialog", { name: nome });
}

async function adicionarExercicio(
  u: UserEvent,
  nome: string,
  { series = "4", reps = "10", descanso = "" } = {},
) {
  const folha = await escolherExercicio(u, nome);
  await u.type(within(folha).getByLabelText("Séries"), series);
  await u.type(within(folha).getByLabelText(/^(Repetições|Tempo)$/), reps);
  if (descanso) await u.type(within(folha).getByLabelText("Descanso (informativo)"), descanso);
  await u.click(within(folha).getByRole("button", { name: "Salvar exercício" }));
}

async function fichaCompleta(u: UserEvent, nome: string) {
  await novaFicha(u, nome);
  await adicionarExercicio(u, "Supino reto", { descanso: "90" });
  await u.click(botao("Salvar ficha"));
}

beforeEach(() => {
  navegar.mockReset();
  rpc.mockClear();
  salvar = () => "w-novo";
});
afterEach(cleanup);

describe("Passo na URL e rascunho na memória (regra 107)", () => {
  it.each(["fichas", "ficha", "adicionar"] as const)(
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

  it("ficha sem exercício: aponta a letra e destaca a linha, sem gravar", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito e tríceps");
    await novaFicha(u, "Costas");
    await u.click(botao("Voltar"));
    expect(linha("Ficha A · Peito e tríceps")).toHaveTextContent("1 exercício");
    expect(linha("Ficha B")).toHaveTextContent("Sem exercícios");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await u.click(botao("Salvar treino"));
    expect(screen.getByRole("alert")).toHaveTextContent("Falta exercício na Ficha B");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cada ficha precisa de pelo menos um exercício. Toque nela para adicionar.",
    );
    expect(linha("Ficha B").closest("li")).toHaveClass("border-border-danger");
    expect(linha("Ficha A · Peito e tríceps").closest("li")).not.toHaveClass(
      "border-border-danger",
    );
    expect(chamadasDeSalvar()).toEqual([]);
  });

  it("voltar sai para a tela do aluno (o rascunho se perde)", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Voltar"));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId",
      params: { alunoId: "a1" },
    });
  });
});

describe("Editar ficha (regras 104, 107 e 149)", () => {
  it("nova ficha: título com a letra e exercícios em seção", async () => {
    const u = abrir();
    await irParaFichas(u);
    await u.click(botao("Adicionar ficha"));
    expect(screen.getByRole("heading", { name: "Ficha A" })).toBeVisible();
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
    await novaFicha(u, "Peito");
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

  it("voltar deixa a ficha como estava", async () => {
    const u = abrir();
    await irParaFichas(u);
    await fichaCompleta(u, "Peito");
    await u.click(linha("Ficha A · Peito"));
    await u.type(screen.getByLabelText("Nome da ficha"), " e ombro");
    await adicionarExercicio(u, "Meu supino");
    await u.click(botao("Voltar"));
    expect(linha("Ficha A · Peito")).toHaveTextContent("1 exercício");
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
    await novaFicha(u, "Peito e tríceps");
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
    rpc.mockImplementationOnce(() => Promise.reject(new ErroApp("forbidden")));
    const u = abrir();
    await abrirBusca(u);
    expect(await screen.findByText(MENSAGENS.forbidden)).toBeVisible();
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
    await novaFicha(u, "Peito");
    return escolherExercicio(u, nome);
  }

  it("repetições: campos vazios com os exemplos e sem Remover", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    expect(folha.getByLabelText("Séries")).toHaveValue("");
    expect(folha.getByLabelText("Séries")).toHaveAttribute("placeholder", "Ex.: 4");
    expect(folha.getByLabelText("Repetições")).toHaveAttribute("placeholder", "Ex.: 10 ou 8-12");
    expect(folha.getByLabelText("Descanso (informativo)")).toHaveAttribute(
      "placeholder",
      "Ex.: 60 s (opcional)",
    );
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
    expect(folha.getByLabelText("Tempo")).toHaveAttribute("placeholder", "Ex.: 30 s");
    expect(folha.queryByLabelText("Repetições")).not.toBeInTheDocument();
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("Digite o tempo.")).toBeVisible();

    await u.type(folha.getByLabelText("Séries"), "3");
    await u.type(folha.getByLabelText("Tempo"), "30");
    await u.type(folha.getByLabelText("Descanso (informativo)"), "45");
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
    await u.type(folha.getByLabelText("Descanso (informativo)"), "601");
    await u.click(folha.getByRole("button", { name: "Salvar exercício" }));
    expect(folha.getByText("Digite o número de séries (de 1 a 20).")).toBeVisible();
    expect(folha.getByText("Confira o tempo de descanso.")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Supino reto" })).toBeVisible();
  });

  it("repetições não passam de 20 caracteres", async () => {
    const u = abrir();
    const folha = within(await abrirFolha(u, "Supino reto"));
    expect(folha.getByLabelText("Repetições")).toHaveAttribute("maxlength", "20");
  });

  it("abrir de novo traz os valores, com 90 s; salvar troca e Remover tira, sem confirmar", async () => {
    const u = abrir();
    await irParaFichas(u);
    await novaFicha(u, "Peito");
    await adicionarExercicio(u, "Supino reto", { descanso: "90" });

    await u.click(linha("Supino reto"));
    const folha = within(screen.getByRole("dialog", { name: "Supino reto" }));
    expect(folha.getByLabelText("Séries")).toHaveValue("4");
    expect(folha.getByLabelText("Repetições")).toHaveValue("10");
    expect(folha.getByLabelText("Descanso (informativo)")).toHaveValue("90 s");
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
