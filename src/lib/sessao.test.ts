// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerUltimoUso, registrarUso } from "./inatividade";

const DIA = 24 * 60 * 60 * 1000;

const getSession = vi.fn();
const signOut = vi.fn();
const from = vi.fn();
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signOut: (...args: unknown[]) => signOut(...args),
    },
    from: (...args: unknown[]) => from(...args),
  },
}));

const comSessao = { data: { session: { user: { id: "u1" } } } };
const semSessao = { data: { session: null } };

/** Perfil de administrador: a leitura termina no perfil, sem vínculo de aluno. */
function perfilDeAdministrador() {
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    single: () =>
      Promise.resolve({ data: { role: "admin", status: "active", full_name: "Ana" }, error: null }),
  };
  from.mockReturnValue(consulta);
}

// O aviso "sessão expirou" vive no módulo: cada teste começa com um módulo novo.
async function carregarModulo() {
  vi.resetModules();
  return import("./sessao");
}

beforeEach(() => {
  localStorage.clear();
  getSession.mockReset();
  signOut.mockReset().mockImplementation(() => {
    getSession.mockResolvedValue(semSessao);
    return Promise.resolve({ error: null });
  });
  from.mockReset();
  perfilDeAdministrador();
});

describe("carregarEstadoSessao com a regra dos 30 dias (regra 121)", () => {
  it("mais de 30 dias sem uso: encerra a sessão neste aparelho e avisa o Login", async () => {
    const { carregarEstadoSessao } = await carregarModulo();
    getSession.mockResolvedValue(comSessao);
    registrarUso(Date.now() - 31 * DIA);

    expect(await carregarEstadoSessao()).toEqual({ tipo: "anonimo", sessaoExpirada: true });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(from).not.toHaveBeenCalled();

    // Depois de sair, a próxima leitura (sem sessão) continua mostrando o aviso.
    expect(await carregarEstadoSessao()).toEqual({ tipo: "anonimo", sessaoExpirada: true });
  });

  it("uso recente: segue logado e marca o uso de agora", async () => {
    const { carregarEstadoSessao } = await carregarModulo();
    getSession.mockResolvedValue(comSessao);
    registrarUso(Date.now() - 3 * DIA);

    const estado = await carregarEstadoSessao();

    expect(estado).toMatchObject({ tipo: "logado", papel: "admin" });
    expect(signOut).not.toHaveBeenCalled();
    expect(Date.now() - (lerUltimoUso() ?? 0)).toBeLessThan(5000);
  });

  it("depois de entrar de novo, segue logado e o aviso some", async () => {
    const { carregarEstadoSessao, registrarEntrada } = await carregarModulo();
    getSession.mockResolvedValue(comSessao);
    registrarUso(Date.now() - 31 * DIA);
    await carregarEstadoSessao();

    // Entrou de novo com e-mail e senha.
    getSession.mockResolvedValue(comSessao);
    registrarEntrada();
    expect(await carregarEstadoSessao()).toMatchObject({ tipo: "logado" });
    expect(signOut).toHaveBeenCalledTimes(1);

    getSession.mockResolvedValue(semSessao);
    expect(await carregarEstadoSessao()).toEqual({ tipo: "anonimo" });
  });

  it("sem sessão e sem aviso, é só anônimo", async () => {
    const { carregarEstadoSessao } = await carregarModulo();
    getSession.mockResolvedValue(semSessao);
    expect(await carregarEstadoSessao()).toEqual({ tipo: "anonimo" });
  });
});

describe("verificarInatividade (ao voltar ao app)", () => {
  it("vencida: encerra a sessão neste aparelho", async () => {
    const { verificarInatividade } = await carregarModulo();
    getSession.mockResolvedValue(comSessao);
    registrarUso(Date.now() - 45 * DIA);

    await verificarInatividade();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("em uso: só marca o uso de agora, sem ir ao servidor", async () => {
    const { verificarInatividade } = await carregarModulo();
    getSession.mockResolvedValue(comSessao);
    registrarUso(Date.now() - 10 * DIA);

    await verificarInatividade();

    expect(signOut).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(Date.now() - (lerUltimoUso() ?? 0)).toBeLessThan(5000);
  });
});
