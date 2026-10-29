import type { ReactNode } from "react";
import { sair } from "@/lib/sessao";
import { BarraFixa, Button, Tela } from "@/ui";

type AreaProvisoriaProps = {
  nome: string;
  area: string;
  /** Ação de verdade que a área já tem (ex.: "Cadastrar aluno"), acima do "Sair". */
  principal?: { texto: string; aoTocar: () => void };
  /** Conteúdo provisório da área (ex.: alunos com convite, até a Lista de alunos). */
  children?: ReactNode;
};

/**
 * "Olá" de cada área, até as fatias trazerem as telas de verdade
 * (administrador: Lista de professores; professor: Lista de alunos; aluno: Home).
 */
export function AreaProvisoria({ nome, area, principal, children }: AreaProvisoriaProps) {
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome;
  return (
    <Tela barra={principal ? "dois" : "um"}>
      <h1 className="text-display">Olá, {primeiroNome}</h1>
      <p className="text-body text-text-secondary">
        Você entrou como {area}. Esta área chega nas próximas fatias.
      </p>
      {children}
      <BarraFixa>
        {principal && <Button onClick={principal.aoTocar}>{principal.texto}</Button>}
        <Button variante="secondary" onClick={sair}>
          Sair
        </Button>
      </BarraFixa>
    </Tela>
  );
}
