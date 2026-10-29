import { useNavigate } from "@tanstack/react-router";
import { urlDoApp } from "@/features/acesso/urlDoApp";
import { BackButton, BarraFixa, Button, EmptyState, Tela, useToast } from "@/ui";

const LINK_COPIADO = "Link copiado."; // proposta: sem texto no Figma nem nas regras
const COPIA_FALHOU = "Não foi possível copiar o link."; // proposta

/** O link só existe aqui: o banco guarda apenas o hash do token (docs/schema-coach-in.md). */
export type LinkDoConvite = { nome: string; comEmail: boolean; token: string };

/** Para quem é o convite: muda a validade, o texto e a lista de volta. */
type Papel = "aluno" | "professor";

function texto(papel: Papel, { nome, comEmail }: Omit<LinkDoConvite, "token">) {
  if (papel === "professor") {
    const primeiroNome = nome.trim().split(/\s+/)[0] || nome;
    return `O link de ${nome} é de uso único e vale por 1 dia. Envie agora para ${primeiroNome} ativar o acesso de professor.`;
  }
  return `O link de ${nome} é de uso único e vale por 7 dias. ${
    comEmail ? "Envie agora para criar o acesso." : "Copie e envie por WhatsApp ou outro app."
  }`;
}

/**
 * "Convite gerado" (regras 57 e 92; Figma "Professor · Alunos", seção 3, e "Admin ·
 * Professores", seção 1), depois de cadastrar o aluno, de convidar o professor ou de reenviar o
 * convite. "Enviar por e-mail" vira o principal no #52; até lá, "Copiar link".
 */
export function ConviteGerado({ papel = "aluno", ...link }: LinkDoConvite & { papel?: Papel }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const voltar = () => navegar({ to: papel === "professor" ? "/admin" : "/professor" });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(urlDoApp(`/convite/${link.token}`));
      mostrarToast("success", LINK_COPIADO);
    } catch {
      mostrarToast("error", COPIA_FALHOU);
    }
  }

  return (
    <Tela barra="dois">
      <BackButton onClick={voltar} />
      <EmptyState icone="check_circle" titulo="Convite gerado" className="flex-1 justify-center">
        {texto(papel, link)}
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
