import type { Papel } from "@/lib/destino";
import { sair } from "@/lib/sessao";
import { BarraFixa, Button, EmptyState, Tela } from "@/ui";

const textos = {
  // Regra 95: professor bloqueado pelo administrador.
  professor: {
    titulo: "Seu acesso está bloqueado",
    texto:
      "Sua conta de professor foi bloqueada e você saiu do app. Fale com quem administra o Coach In para saber mais.",
  },
  // Regra 119: conta de aluno bloqueada (só a tela existe no MVP).
  aluno: {
    titulo: "Sua conta está bloqueada",
    texto:
      "Sua conta foi bloqueada e você saiu do app. Fale com o administrador do Coach In ou com o seu professor para saber mais.",
  },
};

export function BloqueadoPage({ papel }: { papel: Papel }) {
  const { titulo, texto } = papel === "professor" ? textos.professor : textos.aluno;
  return (
    <Tela barra="um">
      <EmptyState icone="lock" titulo={titulo} className="flex-1 justify-center">
        {texto}
      </EmptyState>
      <BarraFixa>
        <Button variante="secondary" onClick={sair}>
          Sair
        </Button>
      </BarraFixa>
    </Tela>
  );
}
