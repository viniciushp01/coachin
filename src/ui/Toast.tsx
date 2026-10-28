import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "./Icon";

export type TomToast = "success" | "error";

type ToastProps = { tom: TomToast; children: ReactNode; className?: string };

/** Aviso curto. A mensagem tem de caber em uma linha (≈ 30 caracteres). */
export function Toast({ tom, children, className }: ToastProps) {
  return (
    <div
      className={clsx(
        "flex h-[56px] w-full items-center gap-12 rounded-tile bg-bg-surface-raised p-16 shadow-raised",
        className,
      )}
    >
      <span
        className={clsx(
          "flex size-24 shrink-0 items-center justify-center rounded-inset text-text-on-brand",
          tom === "success" ? "bg-status-success" : "bg-status-danger",
        )}
      >
        <Icon nome={tom === "success" ? "check" : "close"} tamanho={16} />
      </span>
      <p className="min-w-0 flex-1 truncate text-body-strong text-text-primary">{children}</p>
    </div>
  );
}

type Aviso = { id: number; tom: TomToast; mensagem: string };
type MostrarToast = (tom: TomToast, mensagem: string) => void;

const ToastContext = createContext<MostrarToast | null>(null);

const DURACAO_MS = 3000;

/** Mostra um toast por vez no topo da tela (x 20, y 52), por cima do conteúdo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const proximoId = useRef(0);

  const mostrar = useCallback<MostrarToast>((tom, mensagem) => {
    proximoId.current += 1;
    setAviso({ id: proximoId.current, tom, mensagem });
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), DURACAO_MS);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(52px,calc(env(safe-area-inset-top)+12px))] z-50 mx-auto max-w-screen px-screen-margin"
      >
        {aviso && (
          <Toast key={aviso.id} tom={aviso.tom}>
            {aviso.mensagem}
          </Toast>
        )}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): MostrarToast {
  const mostrar = useContext(ToastContext);
  if (!mostrar) throw new Error("useToast precisa de <ToastProvider>.");
  return mostrar;
}
