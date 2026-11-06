import clsx from "clsx";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { soltarFecha, toqueSobraParaAPagina } from "./gestoDaFolha";

type SheetProps = {
  aberta: boolean;
  /** Tocar fora, Esc e arrastar para baixo chamam só isto: fechar nunca confirma nada (regra 160). */
  aoFechar: () => void;
  titulo: string;
  /** Texto de apoio, Notice, lista… Rola dentro da folha se não couber. */
  children?: ReactNode;
  /** Botões no fim da folha, sempre visíveis (confirmação: primary para manter, secondary para a ação). */
  acoes?: ReactNode;
  className?: string;
};

const DURACAO_MS = 180;
const PAUSA_MS = 100;
const FIM_DA_FOLHA = "pb-[max(48px,calc(env(safe-area-inset-bottom)+24px))]";

type Arrasto = {
  ponteiro: number;
  inicioY: number;
  ultimoY: number;
  ultimoEm: number;
  velocidade: number;
  altura: number;
};

/**
 * Folha inferior sobre o escurecimento (scrim). Usa <dialog> modal: foco preso, Esc fecha. Tocar
 * fora ou arrastar a alça ou o título para baixo também fecha (regra 160). O escurecimento é um
 * elemento próprio, e não o ::backdrop, para clarear junto com o arrasto.
 */
export function Sheet({ aberta, aoFechar, titulo, children, acoes, className }: SheetProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const folha = useRef<HTMLDivElement>(null);
  const escurecimento = useRef<HTMLDivElement>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const abertaAgora = useRef(aberta);

  function posicionar(deslocamento: number, altura: number, animar: boolean) {
    const transicao = animar ? `${DURACAO_MS}ms ease-out` : "";
    if (folha.current) {
      folha.current.style.transition = transicao && `transform ${transicao}`;
      folha.current.style.transform = deslocamento ? `translateY(${deslocamento}px)` : "";
    }
    if (escurecimento.current) {
      escurecimento.current.style.transition = transicao && `opacity ${transicao}`;
      escurecimento.current.style.opacity = deslocamento
        ? String(Math.max(0, 1 - deslocamento / altura))
        : "";
    }
  }

  useEffect(() => {
    const el = dialogo.current;
    abertaAgora.current = aberta;
    if (!el) return;
    if (aberta && !el.open) {
      posicionar(0, 1, false);
      el.showModal();
    }
    if (!aberta && el.open) el.close();
  }, [aberta]);

  // Nenhum gesto na folha recarrega a página. O CSS cobre o Chrome (global.css); no Safari, só
  // cancelando o toque. Precisa ser um ouvinte não passivo, e o `onTouchMove` do React é passivo.
  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    let ultimoY = 0;
    const aoTocar = (e: TouchEvent) => {
      ultimoY = e.touches[0]?.clientY ?? 0;
    };
    const aoMover = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? ultimoY;
      const dy = y - ultimoY;
      ultimoY = y;
      if (e.touches.length > 1 || !e.cancelable) return;
      if (toqueSobraParaAPagina(e.target, el, dy)) e.preventDefault();
    };
    el.addEventListener("touchstart", aoTocar, { passive: true });
    el.addEventListener("touchmove", aoMover, { passive: false });
    return () => {
      el.removeEventListener("touchstart", aoTocar);
      el.removeEventListener("touchmove", aoMover);
    };
  }, []);

  const fechamento = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(fechamento.current), []);

  function aoApertar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || fechamento.current !== undefined) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = {
      ponteiro: e.pointerId,
      inicioY: e.clientY,
      ultimoY: e.clientY,
      ultimoEm: e.timeStamp,
      velocidade: 0,
      altura: folha.current?.offsetHeight ?? 0,
    };
  }

  function aoArrastar(e: PointerEvent<HTMLDivElement>) {
    const a = arrasto.current;
    if (!a || a.ponteiro !== e.pointerId) return;
    const tempo = e.timeStamp - a.ultimoEm;
    if (tempo > 0) a.velocidade = (e.clientY - a.ultimoY) / tempo;
    a.ultimoY = e.clientY;
    a.ultimoEm = e.timeStamp;
    // Só para baixo: para cima a folha não sai do lugar.
    posicionar(Math.max(0, e.clientY - a.inicioY), a.altura, false);
  }

  function aoSoltar(e: PointerEvent<HTMLDivElement>, cancelado = false) {
    const a = arrasto.current;
    if (!a || a.ponteiro !== e.pointerId) return;
    arrasto.current = null;
    const deslocamento = Math.max(0, a.ultimoY - a.inicioY);
    // Parou o dedo antes de soltar: a velocidade do último movimento já não vale.
    const velocidade = e.timeStamp - a.ultimoEm > PAUSA_MS ? 0 : a.velocidade;
    if (cancelado || !soltarFecha({ deslocamento, altura: a.altura, velocidade })) {
      posicionar(0, a.altura, true);
      return;
    }
    posicionar(a.altura, a.altura, true);
    fechamento.current = setTimeout(() => {
      fechamento.current = undefined;
      aoFechar();
    }, DURACAO_MS);
  }

  return (
    <dialog
      ref={dialogo}
      aria-label={titulo}
      // Fechou pelo navegador (Esc). Fechar por `aberta` já é decisão de quem usa: não avisa de volta.
      onClose={() => {
        if (abertaAgora.current) aoFechar();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden overscroll-none bg-transparent p-0 text-text-primary backdrop:bg-transparent"
    >
      <div
        ref={escurecimento}
        data-testid="escurecimento"
        aria-hidden="true"
        onClick={aoFechar}
        className="absolute inset-0 touch-none bg-bg-scrim"
      />
      <div
        ref={folha}
        className={clsx(
          "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-sheet bg-bg-surface shadow-sheet",
          className,
        )}
      >
        <div
          data-testid="zona-de-arrastar"
          onPointerDown={aoApertar}
          onPointerMove={aoArrastar}
          onPointerUp={aoSoltar}
          onPointerCancel={(e) => aoSoltar(e, true)}
          className="flex min-h-[48px] shrink-0 cursor-grab touch-none flex-col gap-16 px-20 pt-12 pb-16 select-none"
        >
          <div aria-hidden="true" className="mx-auto h-4 w-40 rounded-[4px] bg-border-default" />
          <h2 className="text-title-md">{titulo}</h2>
        </div>
        {children && (
          <div
            className={clsx(
              "min-h-0 overflow-y-auto overscroll-contain px-20 text-body text-text-secondary",
              !acoes && FIM_DA_FOLHA,
            )}
          >
            {children}
          </div>
        )}
        {acoes && (
          <div
            className={clsx(
              "flex shrink-0 flex-col gap-16 px-20",
              children && "pt-16",
              FIM_DA_FOLHA,
            )}
          >
            {acoes}
          </div>
        )}
      </div>
    </dialog>
  );
}
