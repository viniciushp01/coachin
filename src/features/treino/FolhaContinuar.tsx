import { Button, Notice, Sheet } from "@/ui";

type FolhaContinuarProps = {
  aberta: boolean;
  /** Primeiro nome do aluno (regra 144). */
  nome: string;
  texto: string;
  aoContinuar: () => void;
  aoComecarDeNovo: () => void;
};

/**
 * "Continuar de onde parou?", sobre Dados (regra 162; Figma "Professor · Treino", seção 11, B1).
 * Fechar sem escolher continua: nunca apaga nada.
 */
export function FolhaContinuar({
  aberta,
  nome,
  texto,
  aoContinuar,
  aoComecarDeNovo,
}: FolhaContinuarProps) {
  return (
    <Sheet
      aberta={aberta}
      aoFechar={aoContinuar}
      titulo="Continuar de onde parou?"
      acoes={
        <>
          <Button onClick={aoContinuar}>Continuar de onde parei</Button>
          <Button variante="secondary" onClick={aoComecarDeNovo}>
            Começar de novo
          </Button>
        </>
      }
    >
      <Notice tom="neutral" titulo={`Treino não salvo de ${nome}`}>
        {texto}
      </Notice>
    </Sheet>
  );
}
