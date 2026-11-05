// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp, MENSAGENS } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { CriarTreinoPage, type PassoDoTreino } from "./CriarTreinoPage";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  useBlocker: () => {},
}));

const SUPINO = {
  id: "ex-supino",
  name: "Supino reto",
  measure: "reps",
  name_normalized: "supino reto",
  muscle_group: "Peito",
  owner_id: null,
};

// O servidor de mentira: cada teste decide o catálogo, os parecidos e o que `create_exercise` faz.
let catalogo: Record<string, unknown>[];
let parecidos: () => unknown[];
let criar: (args: Record<string, unknown>) => unknown;
const rpc = vi.fn((funcao: string, args: Record<string, unknown>) =>
  Promise.resolve().then(() => {
    if (funcao === "search_exercises") return catalogo;
    if (funcao === "similar_exercises") return parecidos();
    if (funcao === "create_exercise") return criar(args);
    throw new Error(`rpc inesperada: ${funcao}`);
  }),
);
vi.mock("@/lib/rpc", () => ({
  rpc: (f: string, a: Record<string, unknown>) => rpc(f, a),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from() {
      const passo = {
        select: () => passo,
        eq: () => passo,
        in: () => passo,
        then: (ok: (r: unknown) => unknown) => Promise.resolve({ error: null, data: [] }).then(ok),
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

// Cada caminho atravessa várias telas digitando: em máquina ocupada, passa dos 5 s padrão.
vi.setConfig({ testTimeout: 20_000 });

const ALUNO = { id: "a1", nome: "Juliana Costa", hoje: "2026-10-29", temTreinoAtual: false };

/** Faz o papel da rota: guarda os passos como o histórico do navegador. */
function Caminho() {
  const [pilha, setPilha] = useState<PassoDoTreino[]>(["dados"]);
  return (
    <CriarTreinoPage
      aluno={ALUNO}
      passo={pilha.at(-1)!}
      irPara={(passo) => setPilha((p) => [...p, passo])}
      voltar={() => setPilha((p) => p.slice(0, -1))}
    />
  );
}

const botao = (name: string) => screen.getByRole("button", { name });
const chamadas = (funcao: string) => rpc.mock.calls.filter(([f]) => f === funcao);
const titulo = (name: string) => screen.findByRole("heading", { name });

async function abrirBusca(u: UserEvent) {
  await u.type(screen.getByLabelText("Nome do treino"), "Hipertrofia");
  await u.click(botao("Continuar"));
  await u.click(botao("Adicionar ficha"));
  await u.type(screen.getByLabelText("Nome da ficha"), "Peito");
  await u.click(botao("Adicionar exercício"));
}

/** Da tela de Dados até tocar em "Criar “texto”". */
async function tocarEmCriar(texto: string) {
  render(
    <ToastProvider>
      <Caminho />
    </ToastProvider>,
  );
  const u = userEvent.setup();
  await abrirBusca(u);
  await u.type(screen.getByRole("searchbox", { name: "Buscar exercício" }), texto);
  await u.click(botao(`Criar “${texto.trim().replace(/\s+/g, " ")}” como novo exercício`));
  return u;
}

async function preencherFolha(
  u: UserEvent,
  nome: string,
  rotulo: "Repetições" | "Tempo",
  valor = "30",
) {
  const folha = await screen.findByRole("dialog", { name: nome });
  await u.type(within(folha).getByLabelText("Séries"), "3");
  await u.type(within(folha).getByLabelText(rotulo), valor);
  await u.click(within(folha).getByRole("button", { name: "Salvar exercício" }));
}

beforeEach(() => {
  rpc.mockClear();
  catalogo = [SUPINO];
  parecidos = () => [];
  criar = (args) => ({
    id: "ex-novo",
    name: args.p_name,
    measure: args.p_measure,
    muscle_group: null,
    owner_id: "p1",
  });
});
afterEach(cleanup);

describe("Linha “Criar” na busca (regra 74)", () => {
  it("só aparece com texto digitado", async () => {
    render(
      <ToastProvider>
        <Caminho />
      </ToastProvider>,
    );
    const u = userEvent.setup();
    await abrirBusca(u);
    expect(screen.queryByRole("button", { name: /como novo exercício$/ })).toBeNull();
    await u.type(screen.getByRole("searchbox", { name: "Buscar exercício" }), "  ");
    expect(screen.queryByRole("button", { name: /como novo exercício$/ })).toBeNull();
    await u.type(screen.getByRole("searchbox", { name: "Buscar exercício" }), "remada");
    expect(botao("Criar “remada” como novo exercício")).toBeVisible();
  });

  it("falha ao procurar parecido vira toast e fica na busca", async () => {
    parecidos = () => {
      throw new ErroApp("forbidden");
    };
    await tocarEmCriar("Remada");
    expect(await screen.findByText(MENSAGENS.forbidden)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Adicionar exercício" })).toBeVisible();
  });
});

describe("Sem parecido (regra 151 (3))", () => {
  it("vai direto a Novo exercício com o nome digitado e os padrões da regra 123", async () => {
    await tocarEmCriar(" Remada nova ");
    await titulo("Novo exercício");
    expect(chamadas("similar_exercises")).toEqual([
      ["similar_exercises", { p_name: "Remada nova" }],
    ]);
    expect(screen.getByLabelText("Nome do exercício")).toHaveValue("Remada nova");
    expect(screen.getByRole("radio", { name: "Repetições" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Tempo" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Sim" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Opcional" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Não" })).not.toBeChecked();
    expect(
      screen.getByText(
        "Peso do corpo (prancha, flexão): use “Não”. O aluno não vê carga nem “Editar carga”.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/grupo/i)).toBeNull();
    expect(chamadas("create_exercise")).toEqual([]);
  });

  it("cria sem grupo e entra na ficha pela folha, com Repetições", async () => {
    const u = await tocarEmCriar("Remada nova");
    await titulo("Novo exercício");
    await u.click(botao("Criar exercício"));
    await waitFor(() => expect(chamadas("create_exercise")).toHaveLength(1));
    expect(chamadas("create_exercise")[0]![1]).toEqual({
      p_name: "Remada nova",
      p_measure: "reps",
      p_load_mode: "required",
    });
    await preencherFolha(u, "Remada nova", "Repetições", "10");
    await titulo("Ficha A");
    expect(screen.getByText("3 séries · 10 reps")).toBeVisible();
  });

  it("medida e modo de carga vão a create_exercise; tempo mostra Tempo na folha", async () => {
    const u = await tocarEmCriar("Prancha com elevação");
    await titulo("Novo exercício");
    await u.click(screen.getByRole("radio", { name: "Tempo" }));
    await u.click(screen.getByRole("radio", { name: "Não" }));
    await u.click(botao("Criar exercício"));
    await waitFor(() => expect(chamadas("create_exercise")).toHaveLength(1));
    expect(chamadas("create_exercise")[0]![1]).toEqual({
      p_name: "Prancha com elevação",
      p_measure: "time",
      p_load_mode: "none",
    });
    await preencherFolha(u, "Prancha com elevação", "Tempo");
    await titulo("Ficha A");
    expect(screen.getByText("3 séries · 30 s")).toBeVisible();
  });

  it("Cancelar descarta o nome editado: a busca e o Criar voltam ao texto de antes", async () => {
    const u = await tocarEmCriar("Remada");
    await titulo("Novo exercício");
    await u.type(screen.getByLabelText("Nome do exercício"), " baixa");
    await u.click(botao("Cancelar"));
    await titulo("Adicionar exercício");
    expect(screen.getByRole("searchbox", { name: "Buscar exercício" })).toHaveValue("Remada");
    await u.click(botao("Criar “Remada” como novo exercício"));
    await titulo("Novo exercício");
    expect(screen.getByLabelText("Nome do exercício")).toHaveValue("Remada");
  });

  it("o nome ainda pode ser corrigido antes de criar", async () => {
    const u = await tocarEmCriar("Remad");
    await titulo("Novo exercício");
    await u.type(screen.getByLabelText("Nome do exercício"), "a baixa");
    await u.click(botao("Criar exercício"));
    await waitFor(() => expect(chamadas("create_exercise")).toHaveLength(1));
    expect(chamadas("create_exercise")[0]![1]).toMatchObject({ p_name: "Remada baixa" });
  });

  it("Cancelar volta à busca com o texto, sem criar", async () => {
    const u = await tocarEmCriar("Remada nova");
    await titulo("Novo exercício");
    await u.click(botao("Cancelar"));
    await titulo("Adicionar exercício");
    expect(screen.getByRole("searchbox", { name: "Buscar exercício" })).toHaveValue("Remada nova");
    expect(chamadas("create_exercise")).toEqual([]);
  });

  it("fechar a folha depois de criar volta à busca, já com o exercício", async () => {
    const u = await tocarEmCriar("Remada nova");
    await titulo("Novo exercício");
    catalogo = [
      { id: "ex-novo", name: "Remada nova", measure: "reps", muscle_group: null, owner_id: "p1" },
    ];
    await u.click(botao("Criar exercício"));
    // Fechar a folha (fundo ou Esc) chega como o evento `close` do <dialog>.
    fireEvent(await screen.findByRole("dialog", { name: "Remada nova" }), new Event("close"));
    await titulo("Adicionar exercício");
    expect(await screen.findByRole("button", { name: /^Remada nova/ })).toHaveTextContent(
      "Seu exercício",
    );
    expect(chamadas("create_exercise")).toHaveLength(1);
  });
});

describe("Já existe um exercício parecido (regras 32, 74 e 151 (3))", () => {
  beforeEach(() => {
    parecidos = () => [SUPINO];
  });

  it("mostra o aviso com o nome digitado, antes de Novo exercício", async () => {
    await tocarEmCriar("Supino reto na barra");
    await screen.findByText("Já existe um exercício parecido");
    expect(screen.getByRole("heading", { name: "Novo exercício" })).toBeVisible();
    expect(screen.getByLabelText("Nome do exercício")).toHaveValue("Supino reto na barra");
    expect(screen.getByLabelText("Nome do exercício")).toHaveAttribute("readonly");
    expect(
      screen.getByText(
        "Supino reto · Peito. Usar o existente mantém o histórico de carga do aluno.",
      ),
    ).toBeVisible();
    expect(botao("Usar “Supino reto”")).toBeVisible();
    expect(botao("Criar mesmo assim")).toBeVisible();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("o parecido por apelido aparece com o próprio nome", async () => {
    parecidos = () => [{ ...SUPINO, name: "Puxada alta aberta", muscle_group: "Costas" }];
    await tocarEmCriar("Pulley");
    expect(
      await screen.findByText(
        "Puxada alta aberta · Costas. Usar o existente mantém o histórico de carga do aluno.",
      ),
    ).toBeVisible();
    expect(botao("Usar “Puxada alta aberta”")).toBeVisible();
  });

  it("o parecido do próprio professor aparece como Seu exercício", async () => {
    parecidos = () => [{ ...SUPINO, name: "Meu supino", muscle_group: null, owner_id: "p1" }];
    await tocarEmCriar("Meu supino 2");
    expect(
      await screen.findByText(
        "Meu supino · Seu exercício. Usar o existente mantém o histórico de carga do aluno.",
      ),
    ).toBeVisible();
  });

  it("nome igual (normalizado) não oferece Criar mesmo assim (regra 157 (9))", async () => {
    const u = await tocarEmCriar("  SUPÍNO   reto ");
    await screen.findByText("Esse nome já existe");
    expect(
      screen.getByText("Supino reto · Peito. Use o existente ou volte e mude o nome."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Criar mesmo assim" })).toBeNull();
    expect(screen.queryByText("Já existe um exercício parecido")).toBeNull();
    await u.click(botao("Usar “Supino reto”"));
    expect(await screen.findByRole("dialog", { name: "Supino reto" })).toBeVisible();
    expect(chamadas("create_exercise")).toEqual([]);
  });

  it("nome igual ao de um exercício próprio mostra Seu exercício, sem Criar mesmo assim", async () => {
    parecidos = () => [
      {
        ...SUPINO,
        name: "Meu supino",
        name_normalized: "meu supino",
        muscle_group: null,
        owner_id: "p1",
      },
    ];
    await tocarEmCriar("Meu supino");
    expect(
      await screen.findByText(
        "Meu supino · Seu exercício. Use o existente ou volte e mude o nome.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Criar mesmo assim" })).toBeNull();
  });

  it("apelido igual não conta como mesmo nome: segue com Criar mesmo assim", async () => {
    parecidos = () => [
      {
        ...SUPINO,
        name: "Puxada alta aberta",
        name_normalized: "puxada alta aberta",
        muscle_group: "Costas",
      },
    ];
    await tocarEmCriar("Pulley");
    await screen.findByText("Já existe um exercício parecido");
    expect(botao("Criar mesmo assim")).toBeVisible();
  });

  it("Usar não cria nada e entra na ficha com a medida do existente", async () => {
    parecidos = () => [{ ...SUPINO, id: "ex-prancha", name: "Prancha frontal", measure: "time" }];
    const u = await tocarEmCriar("Prancha");
    await u.click(await screen.findByRole("button", { name: "Usar “Prancha frontal”" }));
    await preencherFolha(u, "Prancha frontal", "Tempo");
    await titulo("Ficha A");
    expect(screen.getByText("3 séries · 30 s")).toBeVisible();
    expect(chamadas("create_exercise")).toEqual([]);
  });

  it("Criar mesmo assim leva a Novo exercício e cria", async () => {
    const u = await tocarEmCriar("Supino reto na barra");
    await u.click(await screen.findByRole("button", { name: "Criar mesmo assim" }));
    expect(screen.getByLabelText("Nome do exercício")).toHaveValue("Supino reto na barra");
    expect(screen.queryByText("Já existe um exercício parecido")).toBeNull();
    await u.click(botao("Criar exercício"));
    await preencherFolha(u, "Supino reto na barra", "Repetições", "10");
    await titulo("Ficha A");
    expect(chamadas("create_exercise")).toHaveLength(1);
  });

  it("de Novo exercício, Cancelar e voltar levam à busca", async () => {
    const u = await tocarEmCriar("Supino reto na barra");
    await u.click(await screen.findByRole("button", { name: "Criar mesmo assim" }));
    await u.click(botao("Cancelar"));
    await titulo("Adicionar exercício");
    await u.click(botao("Criar “Supino reto na barra” como novo exercício"));
    await u.click(await screen.findByRole("button", { name: "Criar mesmo assim" }));
    await u.click(botao("Voltar"));
    await titulo("Adicionar exercício");
    expect(chamadas("create_exercise")).toEqual([]);
  });

  it("voltar do aviso retorna à busca", async () => {
    const u = await tocarEmCriar("Supino reto na barra");
    await screen.findByText("Já existe um exercício parecido");
    await u.click(botao("Voltar"));
    await titulo("Adicionar exercício");
  });
});

describe("Erros ao criar", () => {
  async function criarComErro(
    codigo: "exercise_exists" | "name_required" | "name_too_long" | "forbidden",
  ) {
    criar = () => {
      throw new ErroApp(codigo);
    };
    const u = await tocarEmCriar("Supino reto");
    await titulo("Novo exercício");
    await u.click(botao("Criar exercício"));
    await waitFor(() => expect(chamadas("create_exercise")).toHaveLength(1));
  }

  it("exercise_exists aparece no nome e não abre a folha (regra 157 (8))", async () => {
    await criarComErro("exercise_exists");
    expect(await screen.findByText("Esse nome já existe. Confira os ocultos.")).toBeVisible();
    expect(screen.getByLabelText("Nome do exercício")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("heading", { name: "Novo exercício" })).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("name_required do servidor fala do exercício, não de “seu nome”", async () => {
    await criarComErro("name_required");
    expect(await screen.findByText("Digite o nome do exercício.")).toBeVisible();
    expect(screen.queryByText(MENSAGENS.name_required)).toBeNull();
  });

  it("name_too_long aparece no nome", async () => {
    await criarComErro("name_too_long");
    expect(await screen.findByText(MENSAGENS.name_too_long)).toBeVisible();
  });

  it("outro erro vira toast e a tela fica", async () => {
    await criarComErro("forbidden");
    expect(await screen.findByText(MENSAGENS.forbidden)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Novo exercício" })).toBeVisible();
  });

  it("nome vazio nem chama o servidor", async () => {
    const u = await tocarEmCriar("Remada");
    await titulo("Novo exercício");
    await u.clear(screen.getByLabelText("Nome do exercício"));
    await u.click(botao("Criar exercício"));
    expect(await screen.findByText("Digite o nome do exercício.")).toBeVisible();
    expect(chamadas("create_exercise")).toEqual([]);
  });

  it("nome com mais de 120 caracteres nem chama o servidor", async () => {
    const u = await tocarEmCriar("Remada");
    await titulo("Novo exercício");
    const campo = screen.getByLabelText("Nome do exercício");
    await u.clear(campo);
    await u.click(campo);
    await u.paste("a".repeat(121));
    await u.click(botao("Criar exercício"));
    expect(await screen.findByText(MENSAGENS.name_too_long)).toBeVisible();
    expect(chamadas("create_exercise")).toEqual([]);
  });
});
