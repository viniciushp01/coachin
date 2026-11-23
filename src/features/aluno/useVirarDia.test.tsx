// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hojeDoAluno } from "@/lib/diaDoAluno";
import { msAteMeiaNoite, useVirarDia } from "./useVirarDia";

const invalidar = vi.fn(() => Promise.resolve());
vi.mock("@tanstack/react-router", () => ({ useRouter: () => ({ invalidate: invalidar }) }));

// Mesmo uso do InicioPage: o "hoje" vem do loader e só muda quando a rota é relida.
function Tela({ hoje, fuso }: { hoje: string; fuso: string | null }) {
  useVirarDia(hoje, fuso);
  return null;
}

function voltarAoApp() {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  invalidar.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("msAteMeiaNoite", () => {
  it("conta até a meia-noite do fuso do aluno, não a do aparelho", () => {
    // 24/11 02:30 UTC = 23/11 23:30 em São Paulo (UTC-3) e 22:30 em Manaus (UTC-4).
    const agora = new Date("2026-11-24T02:30:00Z");
    expect(msAteMeiaNoite("America/Sao_Paulo", agora)).toBe(30 * 60_000);
    expect(msAteMeiaNoite("America/Manaus", agora)).toBe(90 * 60_000);
  });
});

describe("useVirarDia (regra 163, item 5)", () => {
  it("voltar ao app no dia seguinte relê a rota", () => {
    vi.setSystemTime(new Date("2026-11-23T23:00:00-03:00"));
    render(<Tela hoje="2026-11-23" fuso="America/Sao_Paulo" />);
    voltarAoApp();
    expect(invalidar).not.toHaveBeenCalled(); // mesmo dia: nada a fazer

    vi.setSystemTime(new Date("2026-11-24T08:00:00-03:00"));
    voltarAoApp();
    expect(invalidar).toHaveBeenCalledTimes(1);
  });

  it("com o app visível, atravessar a meia-noite relê a rota sem precisar de evento", () => {
    vi.setSystemTime(new Date("2026-11-23T23:59:00-03:00"));
    render(<Tela hoje="2026-11-23" fuso="America/Sao_Paulo" />);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(invalidar).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(invalidar).toHaveBeenCalledTimes(1);
    expect(hojeDoAluno("America/Sao_Paulo")).toBe("2026-11-24");
  });

  it("usa o fuso do aluno: em Manaus a virada vem uma hora depois", () => {
    vi.setSystemTime(new Date("2026-11-23T23:30:00-03:00")); // 22:30 em Manaus
    render(<Tela hoje="2026-11-23" fuso="America/Manaus" />);
    voltarAoApp();
    act(() => {
      vi.advanceTimersByTime(60 * 60_000); // 23:30 em Manaus: ainda é dia 23
    });
    expect(invalidar).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(31 * 60_000);
    });
    expect(invalidar).toHaveBeenCalledTimes(1);
  });

  it("sem conexão funciona igual: só pede a releitura, quem refaz o dia é o loader", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.setSystemTime(new Date("2026-11-23T23:00:00-03:00"));
    render(<Tela hoje="2026-11-23" fuso={null} />);
    vi.setSystemTime(new Date("2026-11-24T00:01:00-03:00"));
    voltarAoApp();
    expect(invalidar).toHaveBeenCalledTimes(1);
  });

  it("depois da releitura, o novo hoje agenda a próxima meia-noite", () => {
    vi.setSystemTime(new Date("2026-11-23T23:59:00-03:00"));
    const { rerender } = render(<Tela hoje="2026-11-23" fuso="America/Sao_Paulo" />);
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    rerender(<Tela hoje="2026-11-24" fuso="America/Sao_Paulo" />);
    invalidar.mockClear();
    act(() => {
      vi.advanceTimersByTime(23 * 3_600_000);
    });
    expect(invalidar).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });
    expect(invalidar).toHaveBeenCalledTimes(1);
  });

  it("ao sair da tela não deixa timer nem ouvinte pendurados", () => {
    vi.setSystemTime(new Date("2026-11-23T23:00:00-03:00"));
    const { unmount } = render(<Tela hoje="2026-11-23" fuso="America/Sao_Paulo" />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date("2026-11-24T08:00:00-03:00"));
    voltarAoApp();
    expect(invalidar).not.toHaveBeenCalled();
  });
});
