import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ErroApp } from "@/lib/erros";
import { BarraFixa, Button, EmptyState, Tela } from "@/ui";

/** Falha ao carregar uma rota (ex.: sem internet ao abrir): tom neutro, nunca vermelho. */
export function ErroDeRota({ error }: ErrorComponentProps) {
  const router = useRouter();
  const semConexao = error instanceof ErroApp && error.codigo === "sem_conexao";
  return (
    <Tela barra="um">
      <EmptyState
        icone={semConexao ? "info" : "warning"}
        titulo={semConexao ? "Sem conexão" : "Algo deu errado"}
        className="flex-1 justify-center"
      >
        {semConexao ? "Confira sua internet e tente de novo." : "Tente de novo em instantes."}
      </EmptyState>
      <BarraFixa>
        <Button onClick={() => router.invalidate()}>Tentar de novo</Button>
      </BarraFixa>
    </Tela>
  );
}
