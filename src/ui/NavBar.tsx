import clsx from "clsx";
import { Icon, type NomeIcone } from "./Icon";

export type AbaAluno = "inicio" | "frequencia" | "progressao" | "historico" | "perfil";

const abas: { id: AbaAluno; rotulo: string; icone: NomeIcone }[] = [
  { id: "inicio", rotulo: "Início", icone: "home" },
  { id: "frequencia", rotulo: "Frequência", icone: "calendar_month" },
  { id: "progressao", rotulo: "Progressão", icone: "trending_up" },
  { id: "historico", rotulo: "Histórico", icone: "history" },
  { id: "perfil", rotulo: "Perfil", icone: "person" },
];

type NavBarProps = {
  ativa: AbaAluno;
  aoEscolher: (aba: AbaAluno) => void;
  className?: string;
};

/**
 * Menu inferior do aluno (só aluno), flutuante por cima do conteúdo.
 * A tela precisa deixar ESPACO_NAVBAR livre embaixo.
 */
export function NavBar({ ativa, aoEscolher, className }: NavBarProps) {
  return (
    <nav
      aria-label="Menu principal"
      className={clsx(
        "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 mx-auto w-[calc(100%-28px)] max-w-[362px]",
        "flex h-[68px] items-center rounded-pill border border-border-subtle bg-bg-surface px-4 py-8 shadow-raised",
        className,
      )}
    >
      {abas.map((aba) => {
        const eAtiva = aba.id === ativa;
        return (
          <button
            key={aba.id}
            type="button"
            onClick={() => aoEscolher(aba.id)}
            aria-current={eAtiva ? "page" : undefined}
            className={clsx(
              "flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-4",
              eAtiva
                ? "rounded-pill bg-bg-surface-raised text-text-primary"
                : "text-text-secondary",
            )}
          >
            <Icon nome={aba.icone} preenchido={eAtiva} />
            <span className="text-nav-label">{aba.rotulo}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Espaço livre que o conteúdo deixa embaixo nas telas com menu (design.md: ≥ 105). */
export const ESPACO_NAVBAR = "pb-[calc(env(safe-area-inset-bottom)+108px)]";
