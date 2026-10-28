import { sair } from "@/lib/sessao";
import { Button, Sheet } from "@/ui";

type FolhaSairProps = {
  aberta: boolean;
  aoFechar: () => void;
};

/**
 * Folha "Sair do app?" (regra 121). Só o Perfil, bloco Conta, a usa (regra 129): nas telas
 * sem professor e bloqueado, "Sair" sai direto. Sair não apaga a fila local (regra 116).
 */
export function FolhaSair({ aberta, aoFechar }: FolhaSairProps) {
  return (
    <Sheet
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Sair do app?"
      acoes={
        <>
          <Button onClick={aoFechar}>Continuar no app</Button>
          <Button variante="secondary" onClick={sair}>
            Sair
          </Button>
        </>
      }
    >
      Você vai precisar entrar de novo com e-mail e senha. Registros que ainda aguardam envio ficam
      guardados neste aparelho.
    </Sheet>
  );
}
