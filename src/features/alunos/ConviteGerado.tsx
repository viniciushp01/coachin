import { useNavigate } from "@tanstack/react-router";
import { urlDoApp } from "@/features/acesso/urlDoApp";
import { BackButton, BarraFixa, Button, EmptyState, Tela, useToast } from "@/ui";

const LINK_COPIADO = "Link copiado."; // proposta: sem texto no Figma nem nas regras
const COPIA_FALHOU = "Não foi possível copiar o link."; // proposta

/** O link só existe aqui: o banco guarda apenas o hash do token (docs/schema-coach-in.md). */
export type Convite = { nome: string; comEmail: boolean; token: string };

/**
 * "Convite gerado" (regra 57; Figma "Professor · Alunos", seção 3), depois de cadastrar o aluno
 * ou de reenviar o convite. Com e-mail, "Enviar por e-mail" vira o principal no #52.
 */
export function ConviteGerado({ nome, comEmail, token }: Convite) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const voltar = () => navegar({ to: "/professor" });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(urlDoApp(`/convite/${token}`));
      mostrarToast("success", LINK_COPIADO);
    } catch {
      mostrarToast("error", COPIA_FALHOU);
    }
  }

  return (
    <Tela barra="dois">
      <BackButton onClick={voltar} />
      <EmptyState icone="check_circle" titulo="Convite gerado" className="flex-1 justify-center">
        {`O link de ${nome} é de uso único e vale por 7 dias. `}
        {comEmail
          ? "Envie agora para ele criar o acesso."
          : "Copie e envie por WhatsApp ou outro app."}
      </EmptyState>
      <BarraFixa>
        <Button onClick={() => void copiar()}>Copiar link</Button>
        <Button variante="secondary" onClick={voltar}>
          Voltar à lista
        </Button>
      </BarraFixa>
    </Tela>
  );
}
