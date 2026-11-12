// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarioPage } from "./CalendarioPage";
import { ExercicioPage } from "./ExercicioPage";
import { FichaEmLeituraPage } from "./FichaEmLeituraPage";
import { HistoricoPage } from "./HistoricoPage";
import { PerfilPage } from "./PerfilPage";
import { ProgressaoPage } from "./ProgressaoPage";
import type { AlunoAcompanhado, DadosDoCalendario, FichaEmLeitura } from "./dados";

const navegar = vi.fn();
const voltar = vi.fn();
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
  useRouter: () => ({ history: { back: voltar } }),
}));

// O jsdom ainda não implementa o <dialog> modal: abrir e fechar só mudam o atributo `open`.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

// Figma "Professor · Acompanhar": Vinicius Alves, quinta 29/10/2026, treino de 05/10 a 29/11.
const aluno: AlunoAcompanhado = {
  id: "a1",
  contaId: "u1",
  nome: "Vinicius Alves",
  fuso: "America/Sao_Paulo",
  hoje: "2026-10-29",
};

const ficha = (id: string, letra: string, nome: string, extra = {}) => ({
  id,
  treinoId: "w1",
  letra,
  nome,
  removida: false,
  exercicios: 6,
  ...extra,
});

const calendario: DadosDoCalendario = {
  aluno,
  fichas: [
    ficha("dA", "A", "Peito e tríceps"),
    ficha("dB", "B", "Costas e bíceps"),
    ficha("dC", "C", "Pernas", { removida: true }),
  ],
  marcacoes: [
    { diaId: "dB", feitoEm: "2026-10-27" },
    { diaId: "dA", feitoEm: "2026-10-26" },
    { diaId: "dC", feitoEm: "2026-10-24" },
    { diaId: "dA", feitoEm: "2026-09-28" },
  ],
  treinos: [{ inicio: "2026-09-07", fim: "2026-11-29" }],
  fimDoAtivo: "2026-11-29",
};

describe("CalendarioPage (Figma, seção 2; regras 43, 61, 69 e 72)", () => {
  it("mês de hoje com as marcações, o total do mês e a dica de toque", () => {
    render(<CalendarioPage dados={calendario} />);
    expect(screen.getByRole("heading", { name: "Calendário" })).toBeVisible();
    expect(screen.getByText("Vinicius Alves · só leitura")).toBeVisible();
    expect(screen.getByText("outubro de 2026")).toBeVisible();
    expect(screen.getByText("3 treinos em outubro")).toBeVisible();
    expect(screen.getByText("Toque em um dia para ver a marcação.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Terça, 27 de outubro, ficha B" })).toBeVisible();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("dias futuros ficam neutros e sem toque; hoje é marcado", () => {
    render(<CalendarioPage dados={calendario} />);
    expect(screen.getByRole("button", { name: "Sexta, 30 de outubro" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quinta, 29 de outubro" })).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("o painel do dia só tem 'Abrir ficha': nada de marcar nem desfazer", async () => {
    render(<CalendarioPage dados={calendario} />);
    await userEvent.click(screen.getByRole("button", { name: /^Terça, 27 de outubro/ }));
    const painel = screen.getByRole("dialog", { name: "Terça, 27 de outubro" });
    expect(within(painel).getByText("✓ Ficha B feita")).toBeVisible();
    expect(within(painel).getByText("Costas e bíceps · 6 exercícios")).toBeVisible();
    expect(within(painel).queryByRole("button", { name: /Marcar|Desfazer|Editar/ })).toBeNull();
    await userEvent.click(within(painel).getByRole("button", { name: "Abrir ficha" }));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId/ficha/$diaId",
      params: { alunoId: "a1", diaId: "dB" },
      search: { em: "2026-10-27" },
    });
  });

  it("dia passado sem registro: só o aviso, sem botão de marcar", async () => {
    render(<CalendarioPage dados={calendario} />);
    await userEvent.click(screen.getByRole("button", { name: /^Quarta, 28 de outubro/ }));
    const painel = screen.getByRole("dialog", { name: "Quarta, 28 de outubro" });
    expect(within(painel).getByText("Sem registro neste dia.")).toBeVisible();
    expect(within(painel).queryByRole("button")).toBeNull();
  });

  it("ficha removida mantém o nome na marcação antiga e perde o 'Abrir ficha' (regra 7)", async () => {
    render(<CalendarioPage dados={calendario} />);
    await userEvent.click(screen.getByRole("button", { name: /^Sábado, 24 de outubro/ }));
    const painel = screen.getByRole("dialog", { name: "Sábado, 24 de outubro" });
    expect(within(painel).getByText("✓ Ficha C feita")).toBeVisible();
    expect(within(painel).getByText("Pernas · 6 exercícios")).toBeVisible();
    expect(within(painel).queryByRole("button", { name: "Abrir ficha" })).toBeNull();
  });

  it("navega pelos meses até o primeiro treino e o fim do último", async () => {
    render(<CalendarioPage dados={calendario} />);
    const anterior = screen.getByRole("button", { name: "Mês anterior" });
    const proximo = screen.getByRole("button", { name: "Próximo mês" });
    await userEvent.click(anterior);
    expect(screen.getByText("setembro de 2026")).toBeVisible();
    expect(screen.getByText("1 treino em setembro")).toBeVisible();
    expect(anterior).toBeDisabled();
    await userEvent.click(proximo);
    await userEvent.click(proximo);
    expect(screen.getByText("novembro de 2026")).toBeVisible();
    expect(screen.getByText("Nenhum treino em novembro")).toBeVisible();
    expect(proximo).toBeDisabled();
  });

  it("treino concluído: aviso com a data do fim, e as marcações depois dela aparecem (regras 43 e 72)", () => {
    const concluido = {
      ...calendario,
      aluno: { ...aluno, hoje: "2026-10-29" },
      fimDoAtivo: "2026-10-25",
      marcacoes: [{ diaId: "dB", feitoEm: "2026-10-27" }],
    };
    render(<CalendarioPage dados={concluido} />);
    expect(screen.getByText("Treino concluído em 25/10")).toBeVisible();
    expect(screen.getByText("As marcações depois dessa data aparecem normalmente.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Terça, 27 de outubro, ficha B" })).toBeVisible();
  });

  it("voltar leva à tela do aluno", async () => {
    render(<CalendarioPage dados={calendario} />);
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId",
      params: { alunoId: "a1" },
    });
  });
});

const exercicio = (id: string, nome: string, extra = {}) => ({
  exercicioId: id,
  nome,
  medida: "reps" as const,
  modoDeCarga: "required" as const,
  series: 4,
  reps: "10",
  descanso: 90,
  observacao: null,
  carga: null,
  ...extra,
});

const fichaLida: FichaEmLeitura = {
  aluno,
  letra: "B",
  nome: "Costas e bíceps",
  removida: false,
  treino: { nome: "Hipertrofia · Fase 2", inicio: "2026-10-05", fim: "2026-11-29" },
  exercicios: [
    exercicio("e1", "Puxada frontal", {
      observacao: "Mantenha o peito aberto.",
      carga: { kg: 55, dia: "2026-10-22" },
    }),
    exercicio("e2", "Remada curvada", { carga: { kg: 62.5, dia: "2026-10-22" }, reps: "12" }),
    exercicio("e3", "Prancha", { medida: "time", reps: "30", modoDeCarga: "none", descanso: 0 }),
    exercicio("e4", "Rosca direta"),
  ],
};

describe("FichaEmLeituraPage (Figma, Calendário · 4; regra 69)", () => {
  it("cabeçalho com o dia em que foi feita e a semana desse dia", () => {
    render(<FichaEmLeituraPage ficha={fichaLida} feitaEm="2026-10-27" />);
    expect(screen.getByText("Feita em 27/10")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ficha B" })).toBeVisible();
    expect(screen.getByText("Costas e bíceps · 4 exercícios")).toBeVisible();
    expect(screen.getByText("Hipertrofia · Fase 2 · Semana 4 de 8")).toBeVisible();
  });

  it("séries, descanso, observação e carga do aluno, sem editar nem marcar", () => {
    render(<FichaEmLeituraPage ficha={fichaLida} feitaEm="2026-10-27" />);
    const itens = screen.getAllByRole("listitem");
    expect(within(itens[0]!).getByText("Puxada frontal")).toBeVisible();
    expect(within(itens[0]!).getByText("4 séries · 10 repetições · Descanso 90 s")).toBeVisible();
    expect(within(itens[0]!).getByText("Mantenha o peito aberto.")).toBeVisible();
    expect(within(itens[0]!).getByText("55")).toBeVisible();
    expect(within(itens[0]!).getByText("Atualizada em 22/10")).toBeVisible();
    expect(within(itens[1]!).getByText("62,5")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Editar|Registrar|Marcar|Desfazer/ })).toBeNull();
  });

  it("exercício de tempo sem carga não mostra o bloco de carga; sem registro, traço", () => {
    render(<FichaEmLeituraPage ficha={fichaLida} feitaEm="2026-10-27" />);
    const itens = screen.getAllByRole("listitem");
    expect(within(itens[2]!).getByText("4 séries · 30 s")).toBeVisible();
    expect(within(itens[2]!).queryByText("Carga")).toBeNull();
    expect(within(itens[3]!).getByText("—")).toBeVisible();
    expect(within(itens[3]!).queryByText(/Atualizada em/)).toBeNull();
  });

  it("sem o dia na URL: 'Ficha' no lugar do 'Feita em'", () => {
    render(<FichaEmLeituraPage ficha={fichaLida} />);
    expect(screen.queryByText(/^Feita em/)).toBeNull();
    expect(screen.getByText("Ficha", { selector: "p" })).toBeVisible();
  });

  it("ficha removida não abre", () => {
    render(<FichaEmLeituraPage ficha={{ ...fichaLida, removida: true }} feitaEm="2026-10-27" />);
    expect(screen.getByText("Esta ficha foi removida do treino.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Ficha B" })).toBeNull();
  });

  it("voltar volta à tela anterior", async () => {
    render(<FichaEmLeituraPage ficha={fichaLida} feitaEm="2026-10-27" />);
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(voltar).toHaveBeenCalled();
  });
});

describe("ProgressaoPage (Figma, seção 3; regras 44 e 63)", () => {
  const exercicios = [
    { exercicioId: "e1", nome: "Puxada frontal", kg: 55, dia: "2026-10-22" },
    { exercicioId: "e2", nome: "Leg press", kg: 140, dia: "2026-10-20" },
  ];

  it("lista só os exercícios com carga, com a última carga", () => {
    render(<ProgressaoPage aluno={aluno} exercicios={exercicios} />);
    expect(screen.getByRole("heading", { name: "Progressão" })).toBeVisible();
    expect(screen.getByText("Exercícios com carga registrada")).toBeVisible();
    expect(screen.getByText("Última carga 55 kg · 22/10")).toBeVisible();
    expect(screen.getByText("Última carga 140 kg · 20/10")).toBeVisible();
  });

  it("tocar num exercício abre o detalhe", async () => {
    render(<ProgressaoPage aluno={aluno} exercicios={exercicios} />);
    await userEvent.click(screen.getByRole("button", { name: /Leg press/ }));
    expect(navegar).toHaveBeenCalledWith({
      to: "/professor/alunos/$alunoId/progressao/$exercicioId",
      params: { alunoId: "a1", exercicioId: "e2" },
    });
  });

  it("sem carga registrada: estado vazio com o primeiro nome (regra 144)", () => {
    render(<ProgressaoPage aluno={aluno} exercicios={[]} />);
    expect(screen.getByText("Sem cargas registradas")).toBeVisible();
    expect(
      screen.getByText("Os exercícios aparecem aqui quando Vinicius registrar a primeira carga."),
    ).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("ExercicioPage (Figma, Progressão · 2; regra 63)", () => {
  it("carga atual e histórico de cargas", () => {
    render(
      <ExercicioPage
        dados={{
          aluno,
          exercicio: { exercicioId: "e1", nome: "Puxada frontal", kg: 55, dia: "2026-10-22" },
          historico: [
            { kg: 55, dia: "2026-10-22" },
            { kg: 50, dia: "2026-10-08" },
            { kg: 47.5, dia: "2026-09-24" },
          ],
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Puxada frontal" })).toBeVisible();
    expect(screen.getByText("Vinicius Alves")).toBeVisible();
    expect(screen.getByText("atualizada em 22/10/2026")).toBeVisible();
    const itens = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(itens.map((i) => i.textContent)).toEqual([
      "55 kg22/10/2026",
      "50 kg08/10/2026",
      "47,5 kg24/09/2026",
    ]);
  });
});

describe("HistoricoPage (Figma, Histórico · 1 Lista; regra 68)", () => {
  it("treinos encerrados com período, semanas e fichas", () => {
    render(
      <HistoricoPage
        aluno={aluno}
        treinos={[
          {
            id: "w2",
            nome: "Hipertrofia · Fase 1",
            inicio: "2026-08-10",
            fim: "2026-10-04",
            semanas: 8,
            letras: ["A", "B", "C"],
          },
          {
            id: "w1",
            nome: "Adaptação",
            inicio: "2026-07-06",
            fim: "2026-08-09",
            semanas: 5,
            letras: ["A", "B"],
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Histórico" })).toBeVisible();
    expect(screen.getByText("Hipertrofia · Fase 1")).toHaveClass("truncate");
    expect(screen.getByText("10/08 – 04/10 · 8 semanas")).toBeVisible();
    expect(screen.getByText("Fichas A, B e C")).toBeVisible();
    expect(screen.getByText("Adaptação")).toBeVisible();
    expect(screen.getByText("06/07 – 09/08 · 5 semanas")).toBeVisible();
    expect(screen.getByText("Fichas A e B")).toBeVisible();
  });

  it("sem treino anterior: estado vazio", () => {
    render(<HistoricoPage aluno={aluno} treinos={[]} />);
    expect(screen.getByText("Nenhum treino anterior")).toBeVisible();
  });
});

describe("PerfilPage (Figma, Perfil · Só leitura; regras 41, 71 e 108)", () => {
  const perfil = {
    aluno,
    nascimento: "1994-03-14",
    telefone: "+5531987654321",
    altura: 1.78,
    peso: 82,
    restricoes: "Dor leve no ombro direito ao fazer supino.",
    atualizadoEm: "2026-10-20",
  };

  it("todos os dados, 'atualizado em', aviso de só leitura e link do WhatsApp", () => {
    render(<PerfilPage perfil={perfil} />);
    expect(screen.getByText("Vinicius Alves · atualizado em 20/10")).toBeVisible();
    expect(screen.getByText("14/03/1994 · 32 anos")).toBeVisible();
    expect(screen.getByText("+55 (31) 98765-4321")).toBeVisible();
    expect(screen.getByText("1,78 m")).toBeVisible();
    expect(screen.getByText("82 kg")).toBeVisible();
    expect(screen.getByText("Dor leve no ombro direito ao fazer supino.")).toBeVisible();
    expect(screen.getByText("Só leitura")).toBeVisible();
    expect(
      screen.getByText("O aluno edita os dados no app. Você vê sempre o valor mais recente."),
    ).toBeVisible();
    const link = screen.getByRole("link", { name: "Abrir WhatsApp" });
    expect(link).toHaveAttribute("href", "https://wa.me/5531987654321");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("nada é editável", () => {
    render(<PerfilPage perfil={perfil} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar|Salvar/ })).toBeNull();
  });

  it("perfil ainda não preenchido: traços, sem link e sem data", () => {
    render(
      <PerfilPage
        perfil={{
          aluno,
          nascimento: null,
          telefone: null,
          altura: null,
          peso: null,
          restricoes: null,
          atualizadoEm: null,
        }}
      />,
    );
    expect(screen.getByText("Vinicius Alves · ainda sem dados")).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.queryByRole("link", { name: "Abrir WhatsApp" })).toBeNull();
  });
});
