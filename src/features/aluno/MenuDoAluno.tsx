import { useNavigate } from "@tanstack/react-router";
import { NavBar, type AbaAluno } from "@/ui";

const DESTINOS = {
  inicio: "/aluno",
  frequencia: "/aluno/frequencia",
  progressao: "/aluno/progressao",
  historico: "/aluno/historico",
  perfil: "/aluno/perfil",
} as const satisfies Record<AbaAluno, string>;

/** Menu inferior das 5 abas do aluno (Figma "Aluno · Abas"); a aba da tela fica marcada. */
export function MenuDoAluno({ ativa }: { ativa: AbaAluno }) {
  const navegar = useNavigate();
  return (
    <NavBar
      ativa={ativa}
      aoEscolher={(aba) => {
        if (aba !== ativa) void navegar({ to: DESTINOS[aba] });
      }}
    />
  );
}
