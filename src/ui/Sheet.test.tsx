// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

const ALTURA = 600;
const aoFechar = vi.fn();

function abrir(aberta = true) {
  const tela = render(
    <Sheet
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Editar exercício"
      acoes={<button>Ok</button>}
    >
      <div data-testid="conteudo">Conteúdo</div>
    </Sheet>,
  );
  const zona = screen.getByTestId("zona-de-arrastar");
  // O jsdom não mede nada: a folha é o pai da zona de arrastar.
  Object.defineProperty(zona.parentElement, "offsetHeight", { value: ALTURA });
  return { ...tela, zona, folha: zona.parentElement! };
}

/** Um evento de ponteiro na hora `t` (ms), para os testes controlarem a velocidade. */
function ponteiro(
  zona: HTMLElement,
  tipo: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  y: number,
  t: number,
) {
  const evento = createEvent[tipo](zona, { clientY: y, pointerId: 1, button: 0 });
  // O React troca um `timeStamp` zerado pela hora atual: os testes começam depois de zero.
  Object.defineProperty(evento, "timeStamp", { value: 1000 + t });
  fireEvent(zona, evento);
}

beforeEach(() => {
  aoFechar.mockReset();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const esperarFechar = () => vi.advanceTimersByTime(1000);

describe("arrastar para fechar (regra 160)", () => {
  it("acompanha o dedo e o escurecimento clareia junto", () => {
    const { zona, folha } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", 250, 500);
    expect(folha.style.transform).toBe("translateY(150px)");
    expect(screen.getByTestId("escurecimento").style.opacity).toBe("0.75");
  });

  it("solta depois de 30% do caminho: fecha uma vez só", () => {
    const { zona } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", 100 + ALTURA * 0.31, 500);
    ponteiro(zona, "pointerUp", 100 + ALTURA * 0.31, 1000);
    esperarFechar();
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("solta antes de 30%, devagar: volta e não fecha", () => {
    const { zona, folha } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", 200, 500);
    ponteiro(zona, "pointerUp", 200, 1000);
    esperarFechar();
    expect(aoFechar).not.toHaveBeenCalled();
    expect(folha.style.transform).toBe("");
  });

  it("gesto rápido fecha mesmo antes de 30%", () => {
    const { zona } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", 200, 50);
    ponteiro(zona, "pointerUp", 200, 60);
    esperarFechar();
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("gesto rápido que para antes de soltar não conta como rápido", () => {
    const { zona } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", 200, 50);
    ponteiro(zona, "pointerUp", 200, 1050);
    esperarFechar();
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it.each([
    ["só tocar", 100],
    ["arrastar para cima", -300],
  ])("%s não move nem fecha", (_, fim) => {
    const { zona, folha } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", fim, 500);
    ponteiro(zona, "pointerUp", fim, 1000);
    esperarFechar();
    expect(folha.style.transform).toBe("");
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("gesto cancelado pelo sistema volta e não fecha", () => {
    const { zona, folha } = abrir();
    ponteiro(zona, "pointerDown", 100, 0);
    ponteiro(zona, "pointerMove", 500, 500);
    ponteiro(zona, "pointerCancel", 500, 1000);
    esperarFechar();
    expect(aoFechar).not.toHaveBeenCalled();
    expect(folha.style.transform).toBe("");
  });
});

describe("os outros jeitos de fechar", () => {
  it("tocar fora fecha", () => {
    abrir();
    fireEvent.click(screen.getByTestId("escurecimento"));
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("Esc (o navegador fecha o <dialog>) fecha", () => {
    abrir();
    fireEvent(screen.getByRole("dialog"), new Event("close"));
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("fechar por quem usa a folha não avisa de volta, para não confirmar nada sem querer", () => {
    const { rerender } = abrir();
    rerender(
      <Sheet aberta={false} aoFechar={aoFechar} titulo="Editar exercício">
        Conteúdo
      </Sheet>,
    );
    fireEvent(screen.getByRole("dialog", { hidden: true }), new Event("close"));
    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe("nenhum gesto recarrega a página (regra 160)", () => {
  function mover(alvo: Element, deY: number, paraY: number) {
    fireEvent.touchStart(alvo, { touches: [{ clientY: deY }] });
    return fireEvent.touchMove(alvo, { touches: [{ clientY: paraY }] });
  }
  // `fireEvent` devolve falso quando o evento foi cancelado.
  const cancelou = (naoCancelado: boolean) => !naoCancelado;

  function comRolagem(el: HTMLElement, medidas: { scrollTop: number }) {
    // O CSS do Tailwind não carrega no jsdom.
    el.style.overflowY = "auto";
    Object.defineProperties(el, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 400 },
      scrollTop: { value: medidas.scrollTop },
    });
  }

  it("puxar para baixo em conteúdo que não rola é cancelado", () => {
    abrir();
    expect(cancelou(mover(screen.getByTestId("conteudo"), 100, 200))).toBe(true);
  });

  it("no escurecimento também", () => {
    abrir();
    expect(cancelou(mover(screen.getByTestId("escurecimento"), 100, 200))).toBe(true);
  });

  it("com conteúdo rolado, puxar para baixo rola a folha", () => {
    abrir();
    const conteudo = screen.getByTestId("conteudo");
    const rolagem = conteudo.parentElement!;
    comRolagem(rolagem, { scrollTop: 100 });
    expect(cancelou(mover(conteudo, 100, 200))).toBe(false);
  });

  it("já no topo, puxar para baixo é cancelado; para cima, rola", () => {
    abrir();
    const conteudo = screen.getByTestId("conteudo");
    comRolagem(conteudo.parentElement!, { scrollTop: 0 });
    expect(cancelou(mover(conteudo, 100, 200))).toBe(true);
    expect(cancelou(mover(conteudo, 200, 100))).toBe(false);
  });
});
