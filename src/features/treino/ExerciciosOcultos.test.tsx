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
  { id: "ex-agacha", name: "Agachamento", measure: "reps", muscle_group: "Pernas", owner_id: null },
  { id: "ex-supino", name: "Supino reto", measure: "reps", muscle_group: "Peito", owner_id: null },
  { id: "ex-meu", name: "Meu supino", measure: "reps", muscle_group: null, owner_id: "p1" },
];

// O servidor de mentira guarda quem está oculto, como `exercise_hidden`.
let ocultos: Set<string>;
let falhar: ((funcao: string, args: Record<string, unknown>) => boolean) | null;
const rpc = vi.fn((funcao: string, args: Record<string, unknown>) =>
  Promise.resolve().then(() => {
    if (falhar?.(funcao, args)) throw new ErroApp("sem_conexao");
    if (funcao === "set_exercise_hidden") {
      if (args.p_hidden) ocultos.add(args.p_exercise_id as string);
      else ocultos.delete(args.p_exercise_id as string);
      return null;
    }
    return CATALOGO.filter((e) => ocultos.has(e.id) === Boolean(args.p_hidden_only));
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

const FICHA = novaFicha();

/** Faz o papel de CriarTreinoPage e da rota: a tela de ocultos é um passo no histórico. */
function Caminho() {
  const [emOcultos, setEmOcultos] = useState(false);
  return (
    <AdicionarExercicio
      ficha={FICHA}
      letra="A"
      criando={false}
      aoCriar={() => {}}
      emOcultos={emOcultos}
      aoVerOcultos={() => setEmOcultos(true)}
      aoVoltar={() => setEmOcultos(false)}
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

const resultado = (titulo: string) =>
  screen.findByRole("button", { name: (nome) => nome.startsWith(titulo) });
const opcoes = (titulo: string) => screen.findByRole("button", { name: `Opções de ${titulo}` });
const linhaDeOcultos = (n: number) =>
  screen.findByRole("button", { name: `Exercícios ocultos (${n})` });
const semLinhaDeOcultos = () =>
  expect(screen.queryByRole("button", { name: /^Exercícios ocultos/ })).not.toBeInTheDocument();
const chamadasDeOcultar = () => rpc.mock.calls.filter(([f]) => f === "set_exercise_hidden");

beforeEach(() => {
  ocultos = new Set();
  falhar = null;
  rpc.mockClear();
});

afterEach(cleanup);

describe("Ocultar da busca", () => {
  it("o ⋯ abre a folha com o nome do exercício, sem gravar nada", async () => {
    const u = abrir();
    await u.click(await opcoes("Supino reto"));

    const folha = screen.getByRole("dialog", { name: "Ocultar da busca?" });
    expect(
      within(folha).getByText(
        "“Supino reto” deixa de aparecer na sua busca. Ele não é excluído: as fichas que já o usam e o histórico de carga continuam.",
      ),
    ).toBeVisible();
    expect(within(folha).getByRole("button", { name: "Ocultar da busca" })).toBeVisible();
    expect(within(folha).getByRole("button", { name: "Cancelar" })).toBeVisible();
    expect(chamadasDeOcultar()).toEqual([]);
  });

  it("tocar no resto da linha continua abrindo Editar exercício", async () => {
    const u = abrir();
    await u.click(await resultado("Supino reto"));
    expect(screen.getByRole("dialog", { name: "Supino reto" })).toBeVisible();
  });

  it("Cancelar fecha a folha e não oculta", async () => {
    const u = abrir();
    await u.click(await opcoes("Supino reto"));
    await u.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(chamadasDeOcultar()).toEqual([]);
    expect(await resultado("Supino reto")).toBeVisible();
  });

  it("confirmar tira da busca e aumenta N", async () => {
    ocultos.add("ex-agacha");
    const u = abrir();
    await linhaDeOcultos(1);
    await u.click(await opcoes("Supino reto"));
    await u.click(screen.getByRole("button", { name: "Ocultar da busca" }));

    expect(await linhaDeOcultos(2)).toBeVisible();
    expect(rpc).toHaveBeenCalledWith("set_exercise_hidden", {
      p_exercise_id: "ex-supino",
      p_hidden: true,
    });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Supino reto/ })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("vale também para o exercício do próprio professor", async () => {
    const u = abrir();
    await u.click(await opcoes("Meu supino"));
    await u.click(screen.getByRole("button", { name: "Ocultar da busca" }));

    expect(await linhaDeOcultos(1)).toBeVisible();
    expect(rpc).toHaveBeenCalledWith("set_exercise_hidden", {
      p_exercise_id: "ex-meu",
      p_hidden: true,
    });
  });

  it("sem ocultos, a linha não aparece", async () => {
    abrir();
    await resultado("Supino reto");
    semLinhaDeOcultos();
  });

  it("erro de rede vira toast, fecha a folha e mantém o exercício na busca", async () => {
    falhar = (funcao) => funcao === "set_exercise_hidden";
    const u = abrir();
    await u.click(await opcoes("Supino reto"));
    await u.click(screen.getByRole("button", { name: "Ocultar da busca" }));

    expect(await screen.findByText(MENSAGENS.sem_conexao)).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await resultado("Supino reto")).toBeVisible();
    semLinhaDeOcultos();
  });

  it("toque duplo em confirmar oculta uma vez só", async () => {
    const u = abrir();
    await u.click(await opcoes("Supino reto"));
    await u.dblClick(screen.getByRole("button", { name: "Ocultar da busca" }));

    await linhaDeOcultos(1);
    expect(chamadasDeOcultar()).toHaveLength(1);
  });
});

describe("Exercícios ocultos", () => {
  const desfazer = (titulo: string) =>
    screen.findByRole("button", { name: (nome) => nome.startsWith(`Desfazer: ${titulo}`) });

  async function abrirOcultos(...ids: string[]) {
    ids.forEach((id) => ocultos.add(id));
    const u = abrir();
    await u.click(await linhaDeOcultos(ids.length));
    return u;
  }

  it("a linha abre a tela com o texto e as linhas do Figma", async () => {
    await abrirOcultos("ex-agacha");

    expect(screen.getByRole("heading", { name: "Exercícios ocultos" })).toBeVisible();
    expect(
      screen.getByText(
        "Não aparecem na sua busca. Nada foi excluído. Toque em desfazer para mostrar de novo.",
      ),
    ).toBeVisible();
    const linha = await desfazer("Agachamento");
    expect(within(linha).getByText("Agachamento")).toBeVisible();
    expect(within(linha).getByText("Pernas · duplicado")).toBeVisible();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("o exercício do professor aparece como “Seu exercício”", async () => {
    await abrirOcultos("ex-meu");
    expect(
      within(await desfazer("Meu supino")).getByText("Seu exercício · duplicado"),
    ).toBeVisible();
  });

  it("pede a lista inteira ao servidor, não só os 30 da busca", async () => {
    await abrirOcultos("ex-agacha");
    expect(rpc).toHaveBeenCalledWith("search_exercises", { p_hidden_only: true, p_limit: 100 });
  });

  it("desfazer tira da lista, reduz N e volta à busca", async () => {
    const u = await abrirOcultos("ex-agacha", "ex-supino");

    await u.click(await desfazer("Agachamento"));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Desfazer: Agachamento/ })).toBeNull(),
    );
    expect(rpc).toHaveBeenCalledWith("set_exercise_hidden", {
      p_exercise_id: "ex-agacha",
      p_hidden: false,
    });
    await u.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await linhaDeOcultos(1)).toBeVisible();
    expect(await resultado("Agachamento")).toBeVisible();
  });

  it("desfazer o último volta sozinho à busca, já sem a linha", async () => {
    const u = await abrirOcultos("ex-agacha");

    await u.click(await desfazer("Agachamento"));

    expect(await resultado("Agachamento")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Adicionar exercício" })).toBeVisible();
    semLinhaDeOcultos();
  });

  it("erro de rede ao desfazer vira toast e mantém o exercício na lista", async () => {
    falhar = (funcao) => funcao === "set_exercise_hidden";
    const u = await abrirOcultos("ex-agacha");

    await u.click(await desfazer("Agachamento"));

    expect(await screen.findByText(MENSAGENS.sem_conexao)).toBeVisible();
    expect(await desfazer("Agachamento")).toBeVisible();
  });

  it("erro de rede ao ler os ocultos vira toast e a busca segue funcionando", async () => {
    falhar = (funcao, args) => funcao === "search_exercises" && args.p_hidden_only === true;
    abrir();

    expect(await screen.findByText(MENSAGENS.sem_conexao)).toBeVisible();
    expect(await resultado("Supino reto")).toBeVisible();
    semLinhaDeOcultos();
  });

  it("voltar de lá devolve a busca com o que foi digitado", async () => {
    ocultos.add("ex-agacha");
    const u = abrir();
    await u.type(screen.getByRole("searchbox", { name: "Buscar exercício" }), "sup");
    await u.click(await linhaDeOcultos(1));
    await u.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.getByRole("searchbox", { name: "Buscar exercício" })).toHaveValue("sup");
  });
});
