import { Button, Sheet } from "@/ui";

type FolhaOpcoesDoExercicioProps = {
  nome: string;
  aoFechar: () => void;
  aoAjustar: () => void;
  aoOcultar: () => void;
};

/**
 * O "⋯" do exercício do professor, que tem duas opções (regras 74 e 151 (4)). Sem tela no Figma:
 * proposta do #94. O predefinido só tem ocultar e vai direto à confirmação.
 */
export function FolhaOpcoesDoExercicio({
  nome,
  aoFechar,
  aoAjustar,
  aoOcultar,
}: FolhaOpcoesDoExercicioProps) {
  return (
    <Sheet
      aberta
      aoFechar={aoFechar}
      titulo={nome}
      acoes={
        <>
          <Button onClick={aoAjustar}>Ajustar medida e carga</Button>
          <Button variante="secondary" onClick={aoOcultar}>
            Ocultar da busca
          </Button>
          <Button variante="secondary" onClick={aoFechar}>
            Cancelar
          </Button>
        </>
      }
    />
  );
}
