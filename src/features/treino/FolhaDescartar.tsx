import { Button, Notice, Sheet } from "@/ui";

type FolhaDescartarProps = {
  aberta: boolean;
  /** O que se perde: muda de tela para tela. */
  aviso: { titulo: string; texto: string };
  aoContinuar: () => void;
  aoDescartar: () => void;
};

/** "Descartar alterações?", sem vermelho (regra 107; Figma "Criar treino · 13 e 14"). */
export function FolhaDescartar({ aberta, aviso, aoContinuar, aoDescartar }: FolhaDescartarProps) {
  return (
    <Sheet
      aberta={aberta}
      aoFechar={aoContinuar}
      titulo="Descartar alterações?"
      acoes={
        <>
          <Button onClick={aoContinuar}>Continuar editando</Button>
          <Button variante="secondary" onClick={aoDescartar}>
            Descartar alterações
          </Button>
        </>
      }
    >
      <Notice tom="neutral" titulo={aviso.titulo}>
        {aviso.texto}
      </Notice>
    </Sheet>
  );
}
