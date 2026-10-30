import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { urlDoApp } from "@/features/acesso/urlDoApp";
import { BackButton, BarraFixa, Button, EmptyState, Tela, useToast } from "@/ui";
import { textoDaEspera, useEnvioPorEmail } from "./envioPorEmail";

const LINK_COPIADO = "Link copiado."; // proposta: sem texto no Figma nem nas regras
const COPIA_FALHOU = "Não foi possível copiar o link."; // proposta

/** O link só existe aqui: o banco guarda apenas o hash do token (docs/schema-coach-in.md). */
export type LinkDoConvite = { nome: string; comEmail: boolean; token: string };

/** Para quem é o convite: muda a validade, o texto e a lista de volta. */
type Papel = "aluno" | "professor";

function texto(papel: Papel, { nome, comEmail }: Omit<LinkDoConvite, "token">) {
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome;
  if (papel === "professor") {
    return `O link de ${nome} é de uso único e vale por 1 dia. Envie agora para ${primeiroNome} ativar o acesso de professor.`;
  }
  return `O link de ${nome} é de uso único e vale por 7 dias. ${
    comEmail
      ? `Envie agora para ${primeiroNome} criar o acesso.`
      : "Copie e envie por WhatsApp ou outro app."
  }`;
}

/**
 * "Convite gerado" (regras 57 e 92; Figma "Professor · Alunos", seção 3, e "Admin ·
 * Professores", seção 1), depois de cadastrar o aluno, de convidar o professor ou de reenviar o
 * convite. Com e-mail, "Enviar por e-mail" é o principal e "Copiar link" fica ao lado; enviado,
 * o toast vem sobre esta mesma tela (Figma "Convite · 3 Enviado (aviso)"). Sem e-mail, "Copiar
 * link" e "Voltar à lista". `enviarAoAbrir`: o reenvio gera o link e já envia (regra 140); se o
 * envio falhar, o link novo segue aqui para copiar.
 */
export function ConviteGerado({
  papel = "aluno",
  enviarAoAbrir = false,
  ...link
}: LinkDoConvite & { papel?: Papel; enviarAoAbrir?: boolean }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const { enviar, enviando, restante } = useEnvioPorEmail();
  const voltar = () => navegar({ to: papel === "professor" ? "/admin" : "/professor" });

  // Uma vez só, mesmo com o efeito rodando duas vezes no StrictMode.
  const jaEnviou = useRef(false);
  useEffect(() => {
    if (!enviarAoAbrir || !link.comEmail || jaEnviou.current) return;
    jaEnviou.current = true;
    void enviar(link.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, []);

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
        {link.comEmail ? (
          <>
            <Button onClick={() => void enviar(link.token)} disabled={enviando || restante > 0}>
              {textoDaEspera(restante, "Enviar por e-mail")}
            </Button>
            <Button variante="secondary" onClick={() => void copiar()}>
              Copiar link
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => void copiar()}>Copiar link</Button>
            <Button variante="secondary" onClick={voltar}>
              Voltar à lista
            </Button>
          </>
        )}
      </BarraFixa>
    </Tela>
  );
}
