import { Button, Notice, Sheet } from "@/ui";

type FolhaRemoverFichaProps = {
  aberta: boolean;
  letra: string;
  aoManter: () => void;
  aoRemover: () => void;
};

/** A remoção só vale em "Salvar alterações"; as marcações ficam (regra 7; "Editar treino · 3"). */
export function FolhaRemoverFicha({ aberta, letra, aoManter, aoRemover }: FolhaRemoverFichaProps) {
  return (
    <Sheet
      aberta={aberta}
      aoFechar={aoManter}
      titulo={`Remover a Ficha ${letra}?`}
      acoes={
        <>
          <Button onClick={aoManter}>Manter ficha</Button>
          <Button variante="secondary" onClick={aoRemover}>
            Remover ficha
          </Button>
        </>
      }
    >
      <Notice tom="neutral" titulo="As marcações antigas continuam">
        Os treinos já marcados nessa ficha seguem no calendário do aluno, com o nome dela.
      </Notice>
    </Sheet>
  );
}
