import { Button, Sheet } from "@/ui";

type FolhaOcultarProps = {
  nome: string;
  gravando: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
};

/** Folha "Ocultar da busca?" (regras 74 e 113; Figma "Biblioteca · 3"). */
export function FolhaOcultar({ nome, gravando, aoFechar, aoConfirmar }: FolhaOcultarProps) {
  return (
    <Sheet
      aberta
      aoFechar={aoFechar}
      titulo="Ocultar da busca?"
      acoes={
        <>
          <Button onClick={aoConfirmar} disabled={gravando}>
            Ocultar da busca
          </Button>
          <Button variante="secondary" onClick={aoFechar}>
            Cancelar
          </Button>
        </>
      }
    >
      “{nome}” deixa de aparecer na sua busca. Ele não é excluído: as fichas que já o usam e o
      histórico de carga continuam.
    </Sheet>
  );
}
