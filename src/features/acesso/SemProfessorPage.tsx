import { BarraFixa, Button, EmptyState, Tela } from "@/ui";
import { sair } from "@/lib/sessao";

/** "Você ainda não tem um professor" (regra 90). Mesma tela para professor não autorizado. */
export function SemProfessorPage() {
  return (
    <Tela barra="um">
      <EmptyState
        icone="mail"
        titulo="Você ainda não tem um professor"
        className="flex-1 justify-center"
      >
        Peça um convite ao seu professor para o seu treino aparecer aqui. Se você é professor, fale
        com quem administra o Coach In para liberar seu acesso.
      </EmptyState>
      <BarraFixa>
        <Button variante="secondary" onClick={sair}>
          Sair
        </Button>
      </BarraFixa>
    </Tela>
  );
}
