// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp, MENSAGENS } from "@/lib/erros";
import { ToastProvider } from "@/ui";
import { AdicionarExercicio } from "./AdicionarExercicio";
import { novaFicha } from "./rascunho";

// A busca espera 250 ms; com a máquina cheia, o primeiro teste passava de 1 s e falhava à toa.
configure({ asyncUtilTimeout: 4000 });

const CATALOGO = [
  {
    id: "ex-supino",
    name: "Supino reto",
    measure: "reps",
    load_mode: "required",
    muscle_group: "Peito",
    owner_id: null,
  },
  {
    id: "ex-meu",
    name: "Prancha com elevação",
    measure: "reps",
    load_mode: "required",
    muscle_group: null,
    owner_id: "p1",
  },
];

// O servidor de mentira: cada teste decide as linhas de `workout_exercises` e o que o ajuste faz.
type LinhaDeFicha = { day_id: string };
let linhasDeFicha: () => { data: LinhaDeFicha[] | null; error: unknown };
let ajustar: (args: Record<string, unknown>) => unknown;
const consultas: unknown[][] = [];
const rpc = vi.fn((funcao: string, args: Record<string, unknown>) =>
  Promise.resolve().then(() => {
    if (funcao === "search_exercises") return args.p_hidden_only ? [] : CATALOGO;
    if (funcao === "set_exercise_settings") return ajustar(args);
    if (funcao === "set_exercise_hidden") return null;
    throw new Error(`rpc inesperada: ${funcao}`);
  }),
);
vi.mock("@/lib/rpc", () => ({
  rpc: (f: string, a: Record<string, unknown>) => rpc(f, a),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from(tabela: string) {
      const passo = {
        select: () => passo,
        in: () => passo,
        eq: (...args: unknown[]) => (consultas.push([tabela, "eq", ...args]), passo),
        is: (...args: unknown[]) => (consultas.push([tabela, "is", ...args]), passo),
        then: (ok: (r: unknown) => unknown) =>
          Promise.resolve(
            tabela === "workout_exercises" ? linhasDeFicha() : { error: null, data: [] },
          ).then(ok),
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

const FICHA = novaFicha();
const aoMudarMedida = vi.fn();

/** Faz o papel de CriarTreinoPage e da rota: ajustar é um passo no histórico. */
function Caminho() {
  const [ajustando, setAjustando] = useState(false);
  return (
    <AdicionarExercicio
      ficha={FICHA}
      letra="A"
      criando={false}
      aoCriar={() => {}}
      ajustando={ajustando}
      aoAjustar={() => setAjustando(true)}
      aoMudarMedida={aoMudarMedida}
      emOcultos={false}
      aoVerOcultos={() => {}}
      aoVoltar={() => setAjustando(false)}
      aoAdicionar={() => {}}
    />
  );
}

function abrir() {
  render(
    <ToastProvider>
      <Caminho />
    </ToastProvider>,
  );
  return userEvent.setup();
}

const botao = (name: string) => screen.getByRole("button", { name });
const opcoes = (nome: string) => screen.findByRole("button", { name: `Opções de ${nome}` });
const chamadasDeAjustar = () => rpc.mock.calls.filter(([f]) => f === "set_exercise_settings");

async function abrirAjuste(u: ReturnType<typeof userEvent.setup>) {
  await u.click(await opcoes("Prancha com elevação"));
  await u.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Ajustar medida e carga" }),
  );
  await screen.findByRole("heading", { name: "Ajustar medida e carga" });
}

beforeEach(() => {
  rpc.mockClear();
  aoMudarMedida.mockClear();
  consultas.length = 0;
  linhasDeFicha = () => ({ data: [], error: null });
  ajustar = (args) => ({ measure: args.p_measure, load_mode: args.p_load_mode });
});
afterEach(cleanup);

describe("O ⋯ da busca (regras 148 e 151 (4))", () => {
  it("o predefinido não oferece ajustar: vai direto a Ocultar da busca", async () => {
    const u = abrir();
    await u.click(await opcoes("Supino reto"));
    expect(screen.getByRole("dialog", { name: "Ocultar da busca?" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ajustar medida e carga" })).toBeNull();
  });

  it("o do professor oferece ajustar e ocultar, sem gravar nada", async () => {
    const u = abrir();
    await u.click(await opcoes("Prancha com elevação"));
    const folha = screen.getByRole("dialog", { name: "Prancha com elevação" });
    expect(within(folha).getByRole("button", { name: "Ajustar medida e carga" })).toBeVisible();
    expect(within(folha).getByRole("button", { name: "Ocultar da busca" })).toBeVisible();
    expect(chamadasDeAjustar()).toEqual([]);
  });

  it("Ocultar da busca segue para a confirmação de sempre", async () => {
    const u = abrir();
    await u.click(await opcoes("Prancha com elevação"));
    await u.click(botao("Ocultar da busca"));
    expect(screen.getByRole("dialog", { name: "Ocultar da busca?" })).toBeVisible();
    expect(rpc.mock.calls.filter(([f]) => f === "set_exercise_hidden")).toEqual([]);
  });
});

describe("Ajustar medida e carga (regras 123 e 151 (4))", () => {
  it("abre com o nome só leitura e os valores atuais", async () => {
    const u = abrir();
    await abrirAjuste(u);
    expect(screen.getByLabelText("Nome do exercício")).toHaveValue("Prancha com elevação");
    expect(screen.getByLabelText("Nome do exercício")).toHaveAttribute("readonly");
    expect(screen.getByRole("radio", { name: "Repetições" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Sim" })).toBeChecked();
    expect(
      screen.getByText(
        "Peso do corpo (prancha, flexão): use “Não”. O aluno não vê carga nem “Editar carga”.",
      ),
    ).toBeVisible();
    expect(botao("Salvar")).toBeVisible();
    expect(botao("Cancelar")).toBeVisible();
  });

  it("sem ficha, sem aviso; a leitura filtra pelo exercício e tira as fichas removidas", async () => {
    const u = abrir();
    await abrirAjuste(u);
    await waitFor(() => expect(consultas.length).toBeGreaterThan(0));
    expect(consultas).toContainEqual(["workout_exercises", "eq", "exercise_id", "ex-meu"]);
    expect(consultas).toContainEqual(["workout_exercises", "is", "workout_days.removed_at", null]);
    expect(screen.queryByText(/^Este exercício está em/)).toBeNull();
  });

  it("com fichas, avisa com N, sem contar duas vezes a mesma ficha, e não bloqueia", async () => {
    linhasDeFicha = () => ({
      data: [{ day_id: "a" }, { day_id: "a" }, { day_id: "b" }, { day_id: "c" }],
      error: null,
    });
    const u = abrir();
    await abrirAjuste(u);
    expect(await screen.findByText("Este exercício está em 3 fichas")).toBeVisible();
    expect(
      screen.getByText(
        "Os valores ficam iguais: um “10” passa a aparecer como “10 s”. Ajuste as fichas depois, na edição.",
      ),
    ).toBeVisible();
    await u.click(botao("Salvar"));
    await waitFor(() => expect(chamadasDeAjustar()).toHaveLength(1));
  });

  it("com uma ficha, o aviso fica no singular", async () => {
    linhasDeFicha = () => ({ data: [{ day_id: "a" }], error: null });
    const u = abrir();
    await abrirAjuste(u);
    expect(await screen.findByText("Este exercício está em 1 ficha")).toBeVisible();
  });

  it("falha ao contar as fichas vira toast e a tela segue funcionando", async () => {
    linhasDeFicha = () => ({ data: null, error: new ErroApp("forbidden") });
    const u = abrir();
    await abrirAjuste(u);
    expect(await screen.findByText(MENSAGENS.forbidden)).toBeVisible();
    expect(botao("Salvar")).toBeEnabled();
  });

  it("Salvar grava, volta à busca, e a folha Editar exercício já usa a medida nova", async () => {
    const u = abrir();
    await abrirAjuste(u);
    await u.click(screen.getByRole("radio", { name: "Tempo" }));
    await u.click(screen.getByRole("radio", { name: "Não" }));
    await u.click(botao("Salvar"));

    await screen.findByRole("heading", { name: "Adicionar exercício" });
    expect(chamadasDeAjustar()).toEqual([
      [
        "set_exercise_settings",
        { p_exercise_id: "ex-meu", p_load_mode: "none", p_measure: "time" },
      ],
    ]);
    expect(aoMudarMedida).toHaveBeenCalledWith("ex-meu", "time");
    expect(await screen.findByText("Alterações salvas.")).toBeVisible();

    await u.click(screen.getByRole("button", { name: /^Prancha com elevação/ }));
    const folha = screen.getByRole("dialog", { name: "Prancha com elevação" });
    expect(within(folha).getByLabelText("Tempo")).toBeVisible();
    expect(within(folha).queryByLabelText("Repetições")).toBeNull();
  });

  it("reabrir depois de salvar mostra os valores novos", async () => {
    const u = abrir();
    await abrirAjuste(u);
    await u.click(screen.getByRole("radio", { name: "Tempo" }));
    await u.click(screen.getByRole("radio", { name: "Opcional" }));
    await u.click(botao("Salvar"));
    await screen.findByRole("heading", { name: "Adicionar exercício" });
    await abrirAjuste(u);
    expect(screen.getByRole("radio", { name: "Tempo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Opcional" })).toBeChecked();
  });

  it.each(["Cancelar", "Voltar"])("%s volta à busca sem gravar nem perguntar", async (nome) => {
    const u = abrir();
    await abrirAjuste(u);
    await u.click(screen.getByRole("radio", { name: "Tempo" }));
    await u.click(botao(nome));
    await screen.findByRole("heading", { name: "Adicionar exercício" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(chamadasDeAjustar()).toEqual([]);
    expect(aoMudarMedida).not.toHaveBeenCalled();
  });

  it("erro do servidor vira toast, fica na tela e deixa tentar de novo", async () => {
    ajustar = () => {
      throw new ErroApp("exercise_predefined");
    };
    const u = abrir();
    await abrirAjuste(u);
    await u.click(botao("Salvar"));
    expect(await screen.findByText(MENSAGENS.exercise_predefined)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ajustar medida e carga" })).toBeVisible();
    expect(botao("Salvar")).toBeEnabled();
    expect(aoMudarMedida).not.toHaveBeenCalled();
  });
});
