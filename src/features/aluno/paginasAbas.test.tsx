// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApp } from "@/lib/erros";
import { ToastProvider } from "@/ui";

// O jsdom ainda não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};
const navegar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
  useRouter: () => ({ invalidate: vi.fn(() => Promise.resolve()), history: { back: vi.fn() } }),
}));
vi.mock("@/lib/sessao", () => ({ sair: vi.fn() }));
vi.mock("@/lib/rpc", () => ({ rpc: vi.fn() }));
const excluir = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("./dadosAbas", () => ({ excluirMinhaConta: excluir }));

import { ExercicioAlunoPage } from "./ExercicioAlunoPage";
import { HistoricoAlunoPage } from "./HistoricoAlunoPage";
import { PerfilAlunoPage } from "./PerfilAlunoPage";
import { ProgressaoAlunoPage } from "./ProgressaoAlunoPage";

const r = (dia: string, kg: number) => ({ dia, kg });
const detalhe = (registros: { dia: string; kg: number }[], hoje = "2026-10-23") =>
  render(<ExercicioAlunoPage dados={{ hoje, nome: "Puxada frontal", registros }} />);

beforeEach(() => {
  navegar.mockClear();
  excluir.mockReset();
});
afterEach(cleanup);

describe("Progressão do aluno: detalhe com gráfico (regra 175, Figma 2b)", () => {
  const varias = [
    r("2026-08-20", 40),
    r("2026-09-10", 40),
    r("2026-09-24", 45),
    r("2026-10-08", 50),
    r("2026-10-22", 55),
  ];

  it("várias cargas: selo verde '+5 kg desde 08/10', gráfico e chips com 3 meses marcado", () => {
    detalhe(varias);
    expect(screen.getByText("+5 kg")).toBeInTheDocument();
    expect(screen.getByText("desde 08/10")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Evolução da carga/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 meses" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("+15 kg em 3 meses")).toBeInTheDocument();
  });

  it("o filtro muda o gráfico e o resumo, mas não o histórico de cargas", async () => {
    detalhe(varias, "2026-11-20");
    const historico = () => within(screen.getByRole("region", { name: "Histórico de cargas" }));
    expect(historico().getAllByRole("listitem")).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "30 dias" }));
    expect(
      screen.getByText(
        "Só uma carga nos últimos 30 dias. Escolha um período maior para comparar com as cargas anteriores.",
      ),
    ).toBeInTheDocument();
    expect(historico().getAllByRole("listitem")).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Tudo" }));
    expect(screen.getByText("+15 kg no total")).toBeInTheDocument();
  });

  it("duas cargas, sem filtro: '+5 kg' e nenhum chip de período", () => {
    detalhe([r("2026-10-08", 35), r("2026-10-22", 40)]);
    expect(screen.getByText("+5 kg")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Período" })).not.toBeInTheDocument();
  });

  it("uma carga só no exercício: primeira carga, sem selo, sem filtro", () => {
    detalhe([r("2026-10-20", 50)]);
    expect(screen.getByText("Primeira carga registrada")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quando você registrar outra carga neste exercício, a evolução aparece aqui.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/desde/)).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Período" })).not.toBeInTheDocument();
  });

  it("cargas iguais: 'Mesma carga', em cinza neutro", () => {
    detalhe([r("2026-09-22", 60), r("2026-10-06", 60), r("2026-10-20", 60)]);
    const selo = screen.getByText("Mesma carga");
    expect(selo).toHaveStyle({ color: "var(--color-text-secondary)" });
  });

  it("carga menor: '−10 kg' em cinza neutro, nunca vermelho", () => {
    detalhe([r("2026-09-22", 150), r("2026-10-06", 150), r("2026-10-20", 140)]);
    const selo = screen.getByText("−10 kg");
    expect(selo).toHaveStyle({ color: "var(--color-text-secondary)" });
  });

  it("período sem registros: cartão com o número do período e o convite a ampliar", async () => {
    detalhe(varias, "2026-12-30");
    await userEvent.click(screen.getByRole("button", { name: "30 dias" }));
    expect(screen.getByText("Nenhuma carga nos últimos 30 dias")).toBeInTheDocument();
    expect(
      screen.getByText("Escolha um período maior para ver a evolução deste exercício."),
    ).toBeInTheDocument();
  });

  it("muitos registros: 5 linhas e 'Ver todos os N registros'", async () => {
    const muitos = Array.from({ length: 9 }, (_, i) => r(`2026-09-${String(i + 10)}`, 40 + i));
    detalhe(muitos);
    const historico = within(screen.getByRole("region", { name: "Histórico de cargas" }));
    expect(historico.getAllByRole("listitem")).toHaveLength(6);
    await userEvent.click(historico.getByRole("button", { name: "Ver todos os 9 registros" }));
    expect(historico.getAllByRole("listitem")).toHaveLength(9);
  });
});

describe("Progressão e Histórico do aluno: lista e vazio", () => {
  it("lista os exercícios com a última carga e abre o detalhe", async () => {
    render(
      <ProgressaoAlunoPage
        exercicios={[{ exercicioId: "e1", nome: "Puxada frontal", kg: 55, dia: "2026-10-22" }]}
      />,
    );
    expect(screen.getByText("Última carga 55 kg · 22/10")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Puxada frontal/ }));
    expect(navegar).toHaveBeenCalledWith({
      to: "/aluno/progressao/$exercicioId",
      params: { exercicioId: "e1" },
    });
  });

  it("sem cargas: estado vazio e menu com a aba ativa marcada", () => {
    render(<ProgressaoAlunoPage exercicios={[]} />);
    expect(screen.getByText("Nenhum exercício ainda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Progressão/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /Início/ })).not.toHaveAttribute("aria-current");
  });

  it("histórico vazio", () => {
    render(<HistoricoAlunoPage treinos={[]} />);
    expect(screen.getByText("Nenhum treino anterior")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Histórico/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("histórico com treinos anteriores", () => {
    render(
      <HistoricoAlunoPage
        treinos={[
          {
            id: "t1",
            nome: "Hipertrofia · Fase 1",
            inicio: "2026-08-10",
            fim: "2026-10-04",
            semanas: 8,
            letras: ["A", "B", "C"],
          },
        ]}
      />,
    );
    expect(screen.getByText("10/08 – 04/10 · 8 semanas")).toBeInTheDocument();
    expect(screen.getByText("Fichas A, B e C")).toBeInTheDocument();
  });
});

describe("Perfil do aluno (regras 120 e 121)", () => {
  const dados = {
    perfil: {
      aluno: { id: "a1", contaId: "u1", nome: "Vinicius", fuso: null, hoje: "2026-10-29" },
      nascimento: "1995-03-14",
      telefone: "+5531987654321",
      altura: 1.78,
      peso: 78.5,
      restricoes: "Dor leve no ombro direito",
      atualizadoEm: "2026-10-22",
    },
    professor: "Carlos Almeida",
    email: "vinicius@email.com",
  };
  const abrir = () =>
    render(
      <ToastProvider>
        <PerfilAlunoPage dados={dados} />
      </ToastProvider>,
    );

  it("mostra os dados, o professor, o e-mail e a versão", () => {
    abrir();
    expect(screen.getByText("14/03/1995 · 31 anos")).toBeInTheDocument();
    expect(screen.getByText("+55 (31) 98765-4321")).toBeInTheDocument();
    expect(screen.getByText("Atualizado em 22/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Carlos Almeida")).toBeInTheDocument();
    expect(screen.getByText("vinicius@email.com")).toBeInTheDocument();
    expect(screen.getByText("Versão do app")).toBeInTheDocument();
  });

  it("Termos e Política aparecem sem toque até o jurídico definir o texto", () => {
    abrir();
    expect(screen.getByText("Termos de uso")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Termos de uso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Política de privacidade" })).not.toBeInTheDocument();
  });

  it("'Editar dados' leva à edição", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Editar dados" }));
    expect(navegar).toHaveBeenCalledWith({ to: "/aluno/perfil/editar" });
  });

  it("'Sair' abre a folha 'Sair do app?'", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(screen.getByRole("dialog", { name: "Sair do app?" })).toBeInTheDocument();
  });

  it("excluir: folha com 'Manter minha conta' e 'Excluir conta'; confirmar volta ao Login", async () => {
    excluir.mockResolvedValue();
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    const folha = screen.getByRole("dialog", { name: "Excluir sua conta?" });
    expect(within(folha).getByRole("button", { name: "Manter minha conta" })).toBeInTheDocument();
    await userEvent.click(within(folha).getByRole("button", { name: "Excluir conta" }));
    expect(excluir).toHaveBeenCalledOnce();
    expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true });
    expect(await screen.findByText("Conta excluída.")).toBeInTheDocument();
  });

  it("excluir sem conexão: folha 'Sem conexão', nada é alterado", async () => {
    excluir.mockRejectedValue(new ErroApp("sem_conexao"));
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    const folha = await screen.findByRole("dialog", { name: "Sem conexão" });
    expect(
      within(folha).getByText("Para excluir sua conta, conecte-se à internet. Nada foi alterado."),
    ).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
    await userEvent.click(within(folha).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("manter a conta fecha a folha sem excluir", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Manter minha conta" }));
    expect(excluir).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- Frequência e Editar dados

import { EditarDadosPage } from "./EditarDadosPage";
import { FrequenciaPage } from "./FrequenciaPage";
import type { DadosDoAluno, TreinoDoAluno } from "./dados";

vi.mock("./acoes", () => ({
  marcarComoFeito: vi.fn(() => Promise.resolve("enviado")),
  desfazerMarcacao: vi.fn(() => Promise.resolve("enviado")),
}));

const treinoAtivo: TreinoDoAluno = {
  id: "t1",
  nome: "Fase 2",
  inicio: "2026-10-05",
  fim: "2026-11-29",
  hoje: "2026-10-29",
  semana: { atual: 4, total: 8 },
  progresso: 0.5,
  concluido: false,
  fichas: [{ id: "dA", letra: "A", nome: "Peito", posicao: 1, removida: false, exercicios: [] }],
  marcacoes: [{ diaId: "dA", feitoEm: "2026-10-26", marcadaEm: "2026-10-26T10:00:00Z" }],
  cargas: {},
};
const inicio: DadosDoAluno = { hoje: "2026-10-29", treino: treinoAtivo };

describe("Frequência do aluno (regras 9, 45 e 163)", () => {
  const abrir = (dados = { aluno: null, inicio, calendario: null }) =>
    render(
      <ToastProvider>
        <FrequenciaPage dados={dados} />
      </ToastProvider>,
    );

  it("mostra o mês com 'N treinos em outubro', sem meta", () => {
    abrir();
    expect(screen.getByText("outubro de 2026")).toBeInTheDocument();
    expect(screen.getByText("1 treino em outubro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Frequência/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("mês sem treino: 'Nenhum treino em novembro'; o calendário vai do início do treino ao fim", async () => {
    abrir();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("Nenhum treino em novembro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeDisabled();
  });

  it("dia futuro não abre; dia passado abre o painel editável com 'Marcar'", async () => {
    abrir();
    expect(screen.getByRole("button", { name: /30 de outubro/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /27 de outubro/ }));
    expect(screen.getByRole("button", { name: "Marcar ficha A" })).toBeInTheDocument();
  });

  it("dia com marcação mostra 'Desfazer'", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: /26 de outubro/ }));
    expect(screen.getByText("✓ Ficha A feita")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeInTheDocument();
  });
});

describe("Editar dados (Figma Perfil · 2 e 6; regras 85, 99 e 108)", () => {
  const perfil = {
    aluno: { id: "a1", contaId: "u1", nome: "Vinicius", fuso: null, hoje: "2026-10-29" },
    nascimento: "1995-03-14",
    telefone: "+5531987654321",
    altura: 1.78,
    peso: 78.5,
    restricoes: null,
    atualizadoEm: null,
  };

  it("vem preenchido com o que está salvo", () => {
    render(
      <ToastProvider>
        <EditarDadosPage perfil={perfil} />
      </ToastProvider>,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Vinicius");
    expect(screen.getByLabelText("Data de nascimento")).toHaveValue("14/03/1995");
    expect(screen.getByLabelText("Altura")).toHaveValue("1,78 m");
    expect(screen.getByLabelText("Peso")).toHaveValue("78,5 kg");
  });

  it("mostra os erros de campo do Figma e não salva", async () => {
    render(
      <ToastProvider>
        <EditarDadosPage perfil={perfil} />
      </ToastProvider>,
    );
    await userEvent.clear(screen.getByLabelText("Nome"));
    await userEvent.clear(screen.getByLabelText("Altura"));
    await userEvent.type(screen.getByLabelText("Altura"), "3,80 m");
    await userEvent.clear(screen.getByLabelText("Peso"));
    await userEvent.type(screen.getByLabelText("Peso"), "5 kg");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Digite seu nome.")).toBeInTheDocument();
    expect(screen.getByText("Digite uma altura entre 1,00 m e 2,50 m.")).toBeInTheDocument();
    expect(screen.getByText("Digite um peso entre 20 kg e 300 kg.")).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });
});
