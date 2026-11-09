// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/ui";
import { FichaPage } from "./FichaPage";
import { InicioPage } from "./InicioPage";
import type { ExercicioDaFicha, TreinoDoAluno } from "./dados";

const navegar = vi.fn();
const invalidar = vi.fn(() => Promise.resolve());
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
  useRouter: () => ({ invalidate: invalidar }),
}));
vi.mock("@/lib/sessao", () => ({ sair: vi.fn() }));

const acoes = vi.hoisted(() => ({
  marcarComoFeito: vi.fn(() => Promise.resolve()),
  desfazerMarcacao: vi.fn(() => Promise.resolve()),
  salvarCarga: vi.fn(() => Promise.resolve()),
}));
vi.mock("./acoes", () => acoes);

const exercicio = (nome: string, extra: Partial<ExercicioDaFicha> = {}): ExercicioDaFicha => ({
  exercicioId: `ex-${nome}`,
  nome,
  medida: "reps",
  modoDeCarga: "required",
  series: 4,
  reps: "10",
  descanso: 90,
  observacao: null,
  ...extra,
});

// Quinta, 29/10/2026: A feita na segunda e B na terça; a próxima é a C (Figma, Home · 1).
const treino: TreinoDoAluno = {
  id: "t1",
  nome: "Hipertrofia · Fase 2",
  inicio: "2026-10-05",
  fim: "2026-11-29",
  hoje: "2026-10-29",
  semana: { atual: 4, total: 8 },
  progresso: 0.5,
  concluido: false,
  fichas: [
    {
      id: "dA",
      letra: "A",
      nome: "Peito e tríceps",
      posicao: 1,
      removida: false,
      exercicios: [exercicio("Supino reto")],
    },
    {
      id: "dB",
      letra: "B",
      nome: "Costas e bíceps",
      posicao: 2,
      removida: false,
      exercicios: [exercicio("Remada curvada")],
    },
    {
      id: "dC",
      letra: "C",
      nome: "Pernas e glúteos",
      posicao: 3,
      removida: false,
      exercicios: [
        exercicio("Agachamento livre", { observacao: "Desça até as coxas ficarem paralelas." }),
        exercicio("Prancha frontal", {
          medida: "time",
          reps: "45",
          modoDeCarga: "none",
          series: 3,
        }),
      ],
    },
  ],
  marcacoes: [
    { diaId: "dA", feitoEm: "2026-10-26", marcadaEm: "2026-10-26T20:00:00Z" },
    { diaId: "dB", feitoEm: "2026-10-27", marcadaEm: "2026-10-27T20:00:00Z" },
  ],
  cargas: { "ex-Agachamento livre": { kg: 60, editadaEm: "2026-10-22T12:00:00Z" } },
};

const renderizar = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);

// O jsdom ainda não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("InicioPage", () => {
  const dados = { hoje: "2026-10-29", treino };

  it("mostra a data, o treino ativo, a semana e a ficha de hoje (Home · 1)", () => {
    renderizar(<InicioPage nome="Vinicius Pereira" dados={dados} />);
    expect(screen.getByText("Quinta, 29 de outubro")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Olá, Vinicius" })).toBeInTheDocument();
    expect(screen.getByText("Semana 4 de 8")).toBeInTheDocument();
    expect(screen.getByText("26 out – 1 nov")).toBeInTheDocument();
    expect(screen.getByText("Ficha C")).toBeInTheDocument();
    expect(screen.getByText("Segue a sequência depois da Ficha B")).toBeInTheDocument();
    expect(screen.getByText("Outras fichas")).toBeInTheDocument();
  });

  it("Ver ficha abre a ficha de hoje", async () => {
    renderizar(<InicioPage nome="Vinicius" dados={dados} />);
    await userEvent.click(screen.getByRole("button", { name: "Ver ficha" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/aluno/ficha/$diaId", params: { diaId: "dC" } });
  });

  describe("depois de treinar no dia (regra 163)", () => {
    const treinou = (pendente?: boolean) => ({
      hoje: "2026-10-29",
      treino: {
        ...treino,
        marcacoes: [
          ...treino.marcacoes,
          { diaId: "dC", feitoEm: "2026-10-29", marcadaEm: "2026-10-29T08:00:00Z", pendente },
        ],
      },
    });

    it("reconhece o treino feito e mostra a próxima ficha sem botão principal", () => {
      renderizar(<InicioPage nome="Vinicius" dados={treinou()} />);
      const card = screen.getByRole("region", { name: "Treino de hoje feito" });
      expect(within(card).getByText("✓ Ficha C")).toBeInTheDocument();
      expect(within(card).getByText("Próximo treino")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ver ficha" })).not.toBeInTheDocument();
      expect(screen.queryByText(/Segue a sequência/)).not.toBeInTheDocument();
      expect(screen.queryByText("Ficha de hoje")).not.toBeInTheDocument();
    });

    it("a próxima ficha continua abrindo, sem bloquear nada (regras 11 e 15)", async () => {
      renderizar(<InicioPage nome="Vinicius" dados={treinou()} />);
      await userEvent.click(screen.getByRole("button", { name: /Próximo treino.*Ficha A/ }));
      expect(navegar).toHaveBeenCalledWith({ to: "/aluno/ficha/$diaId", params: { diaId: "dA" } });
    });

    it("marcação aguardando envio conta como feita hoje", () => {
      renderizar(<InicioPage nome="Vinicius" dados={treinou(true)} />);
      expect(screen.getByText("Treino de hoje feito")).toBeInTheDocument();
      expect(screen.getAllByText("AGUARDANDO ENVIO").length).toBeGreaterThan(0);
    });

    it("no dia seguinte volta ao estado normal", () => {
      const base = treinou();
      const amanha = { hoje: "2026-10-30", treino: { ...base.treino, hoje: "2026-10-30" } };
      renderizar(<InicioPage nome="Vinicius" dados={amanha} />);
      expect(screen.queryByText("Treino de hoje feito")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ver ficha" })).toBeInTheDocument();
    });
  });

  it("sem treino ativo mostra a tela vazia (Home · 4)", () => {
    renderizar(<InicioPage nome="Vinicius" dados={{ hoje: "2026-10-29", treino: null }} />);
    expect(screen.getByText("Sem treino por enquanto")).toBeInTheDocument();
  });

  it("treino concluído segue com as fichas (regra 5)", () => {
    const concluido = { ...treino, concluido: true, progresso: 1 };
    renderizar(<InicioPage nome="Vinicius" dados={{ hoje: "2026-12-01", treino: concluido }} />);
    expect(screen.getAllByText("Treino concluído").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Ver ficha" })).toBeInTheDocument();
  });

  it("marca uma ficha em dia passado pelo painel do dia", async () => {
    renderizar(<InicioPage nome="Vinicius" dados={dados} />);
    await userEvent.click(screen.getByRole("button", { name: /^Quarta, 28 de outubro/ }));
    const painel = screen.getByRole("dialog", { name: "Quarta, 28 de outubro" });
    expect(within(painel).getByText("Sem registro neste dia.")).toBeInTheDocument();
    await userEvent.click(within(painel).getByRole("button", { name: "Marcar ficha C" }));
    expect(acoes.marcarComoFeito).toHaveBeenCalledWith("dC", "2026-10-28");
    expect(invalidar).toHaveBeenCalled();
  });

  it("desfaz uma marcação pelo painel do dia", async () => {
    renderizar(<InicioPage nome="Vinicius" dados={dados} />);
    await userEvent.click(screen.getByRole("button", { name: /^Terça, 27 de outubro/ }));
    const painel = screen.getByRole("dialog", { name: "Terça, 27 de outubro" });
    expect(within(painel).getByText("✓ Ficha B feita")).toBeInTheDocument();
    await userEvent.click(within(painel).getByRole("button", { name: "Desfazer" }));
    expect(acoes.desfazerMarcacao).toHaveBeenCalledWith("dB", "2026-10-27");
  });

  it("dias futuros não abrem (regra 24)", () => {
    renderizar(<InicioPage nome="Vinicius" dados={dados} />);
    expect(screen.getByRole("button", { name: /^Sexta, 30 de outubro/ })).toBeDisabled();
  });
});

describe("FichaPage", () => {
  it("mostra séries, descanso, observação e carga (Ficha · 1 e 4)", () => {
    renderizar(<FichaPage treino={treino} fichaId="dC" />);
    expect(screen.getByText("Ficha de hoje")).toBeInTheDocument();
    expect(screen.getByText("Pernas e glúteos · 2 exercícios")).toBeInTheDocument();
    expect(screen.getByText("4 séries · 10 repetições · Descanso 90 s")).toBeInTheDocument();
    expect(screen.getByText("3 séries · 45 s · Descanso 90 s")).toBeInTheDocument();
    expect(screen.getByText("Desça até as coxas ficarem paralelas.")).toBeInTheDocument();
    expect(screen.getByText("Atualizada em 22/10")).toBeInTheDocument();
    // A prancha não tem carga (regra 123): só o agachamento oferece "Editar".
    expect(screen.getAllByRole("button", { name: /^Editar carga/ })).toHaveLength(1);
  });

  it('a ficha seguinte vira "Próximo treino" depois de treinar hoje (regra 163)', () => {
    const treinou = {
      ...treino,
      marcacoes: [
        ...treino.marcacoes,
        { diaId: "dC", feitoEm: "2026-10-29", marcadaEm: "2026-10-29T08:00:00Z" },
      ],
    };
    renderizar(<FichaPage treino={treinou} fichaId="dA" />);
    expect(screen.getByText("Próximo treino")).toBeInTheDocument();
    expect(screen.queryByText("Ficha de hoje")).not.toBeInTheDocument();
  });

  it("marca como feito hoje e mostra o aviso", async () => {
    renderizar(<FichaPage treino={treino} fichaId="dC" />);
    await userEvent.click(screen.getByRole("button", { name: "Marcar como feito" }));
    expect(acoes.marcarComoFeito).toHaveBeenCalledWith("dC", "2026-10-29");
    expect(await screen.findByText("Treino marcado. Bom trabalho!")).toBeInTheDocument();
  });

  it("feita hoje oferece desfazer (Ficha · 3)", async () => {
    const feita = {
      ...treino,
      marcacoes: [
        ...treino.marcacoes,
        { diaId: "dC", feitoEm: "2026-10-29", marcadaEm: "2026-10-29T20:00:00Z" },
      ],
    };
    renderizar(<FichaPage treino={feita} fichaId="dC" />);
    expect(screen.getByText("✓ Feita hoje")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Desfazer marcação" }));
    expect(acoes.desfazerMarcacao).toHaveBeenCalledWith("dC", "2026-10-29");
  });

  it("salva a carga sem marcar o treino (regra 27)", async () => {
    renderizar(<FichaPage treino={treino} fichaId="dC" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Editar carga de Agachamento livre" }),
    );
    const campo = screen.getByLabelText("Carga (kg)");
    expect(campo).toHaveValue("60");
    await userEvent.clear(campo);
    await userEvent.type(campo, "62,5");
    await userEvent.click(screen.getByRole("button", { name: "Salvar carga" }));
    expect(acoes.salvarCarga).toHaveBeenCalledWith("ex-Agachamento livre", 62.5);
    expect(acoes.marcarComoFeito).not.toHaveBeenCalled();
  });

  it("recusa carga inválida na folha", async () => {
    renderizar(<FichaPage treino={treino} fichaId="dC" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Editar carga de Agachamento livre" }),
    );
    await userEvent.clear(screen.getByLabelText("Carga (kg)"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar carga" }));
    expect(screen.getByText("Digite uma carga entre 0,1 e 1000 kg.")).toBeInTheDocument();
    expect(acoes.salvarCarga).not.toHaveBeenCalled();
  });
});

describe("sem conexão (regra 116)", () => {
  it("Início avisa que mostra o treino salvo e quantos registros aguardam envio", () => {
    renderizar(
      <InicioPage
        nome="Vinicius"
        dados={{ hoje: "2026-10-29", treino, offline: true, pendentes: 2 }}
      />,
    );
    expect(screen.getByText("Sem conexão")).toBeInTheDocument();
    expect(
      screen.getByText("Mostrando o treino salvo neste aparelho. 2 registros aguardam envio."),
    ).toBeInTheDocument();
  });

  it("Início com conexão e nada na fila não mostra aviso", () => {
    renderizar(<InicioPage nome="Vinicius" dados={{ hoje: "2026-10-29", treino, pendentes: 0 }} />);
    expect(screen.queryByText("Sem conexão")).not.toBeInTheDocument();
    expect(screen.queryByText("Aguardando envio")).not.toBeInTheDocument();
  });

  it("marcar sem conexão guarda no aparelho e avisa", async () => {
    acoes.marcarComoFeito.mockResolvedValueOnce("guardado" as never);
    renderizar(<FichaPage treino={treino} fichaId="dC" offline />);
    await userEvent.click(screen.getByRole("button", { name: "Marcar como feito" }));
    expect(await screen.findByText("Guardado. Envio quando voltar.")).toBeInTheDocument();
  });

  it("ficha marcada e ainda não enviada mostra AGUARDANDO ENVIO no lugar de Feita hoje", () => {
    const pendente = {
      ...treino,
      marcacoes: [
        ...treino.marcacoes,
        { diaId: "dC", feitoEm: "2026-10-29", marcadaEm: "2026-10-29T20:00:00Z", pendente: true },
      ],
    };
    renderizar(<FichaPage treino={pendente} fichaId="dC" offline />);
    expect(screen.getByText("AGUARDANDO ENVIO")).toBeInTheDocument();
    expect(screen.queryByText("✓ Feita hoje")).not.toBeInTheDocument();
  });

  it("a folha de carga explica que a carga fica no aparelho e deixa salvar", async () => {
    renderizar(<FichaPage treino={treino} fichaId="dC" offline />);
    await userEvent.click(
      screen.getByRole("button", { name: "Editar carga de Agachamento livre" }),
    );
    expect(
      screen.getByText("Sem conexão: a carga fica neste aparelho e é enviada depois."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar carga" })).toBeEnabled();
  });
});
