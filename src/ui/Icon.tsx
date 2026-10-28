import { icones, type NomeIcone } from "./icons.generated";

export type { NomeIcone };

type IconProps = {
  nome: NomeIcone;
  /** Ativo ou selecionado usa o preenchido (design.md, seção 7). */
  preenchido?: boolean;
  /** Em px. Padrão 24. */
  tamanho?: 16 | 20 | 24 | 40;
  className?: string;
};

/** Material Symbols Rounded. A cor vem do texto do pai (currentColor). */
export function Icon({ nome, preenchido = false, tamanho = 24, className }: IconProps) {
  const d = icones[nome][preenchido ? "filled" : "outline"];
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
