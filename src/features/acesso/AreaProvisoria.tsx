import { sair } from "@/lib/sessao";
import { BarraFixa, Button, Tela } from "@/ui";

type AreaProvisoriaProps = {
  nome: string;
  area: string;
};

/** "Olá" da área do aluno, até a fatia da Home trazer a tela de verdade. */
export function AreaProvisoria({ nome, area }: AreaProvisoriaProps) {
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
