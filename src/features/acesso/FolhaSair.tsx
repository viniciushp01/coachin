import { sair } from "@/lib/sessao";
import { Button, Sheet } from "@/ui";

type FolhaSairProps = {
  aberta: boolean;
  aoFechar: () => void;
  /** Avisa da fila local de registros (só o aluno tem; regra 145 tira o aviso do administrador). */
  comFilaLocal?: boolean;
};

/**
 * Folha "Sair do app?" (regra 121). O aluno a abre pelo Perfil, bloco Conta (regra 129); o
 * administrador, pelo ícone de sair da Lista de professores (regra 145). Nas telas sem professor
 * e bloqueado, "Sair" sai direto. Sair não apaga a fila local (regra 116).
 */
export function FolhaSair({ aberta, aoFechar, comFilaLocal = true }: FolhaSairProps) {
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
      Você vai precisar entrar de novo com e-mail e senha.
      {comFilaLocal && " Registros que ainda aguardam envio ficam guardados neste aparelho."}
    </Sheet>
  );
}
