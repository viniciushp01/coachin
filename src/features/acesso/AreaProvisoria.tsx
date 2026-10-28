import { sair } from "@/lib/sessao";
import { BarraFixa, Button, Tela } from "@/ui";

/**
 * "Olá" de cada área, até as fatias trazerem as telas de verdade
 * (administrador: Lista de professores; professor: Lista de alunos; aluno: Home).
 */
export function AreaProvisoria({ nome, area }: { nome: string; area: string }) {
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome;
  return (
    <Tela barra="um">
      <h1 className="text-display">Olá, {primeiroNome}</h1>
      <p className="text-body text-text-secondary">
        Você entrou como {area}. Esta área chega nas próximas fatias.
      </p>
      <BarraFixa>
        <Button variante="secondary" onClick={sair}>
          Sair
        </Button>
      </BarraFixa>
    </Tela>
  );
}
