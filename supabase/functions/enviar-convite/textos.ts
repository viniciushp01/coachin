/**
 * Textos dos e-mails de convite (regra 136; texto neutro, regra 144). Registrados também em
 * docs/email-convites-pt-br.md: mudou aqui, mude lá.
 */

export type Tipo = "student" | "teacher";

type Email = { assunto: string; titulo: string; corpo: string; botao: string };

const FECHO = "Se você não esperava este convite, pode ignorar esta mensagem.";

export function textoDoConvite(tipo: Tipo, quemConvidou: string): Email {
  if (tipo === "teacher") {
    return {
      assunto: "Seu acesso de professor no Coach In",
      titulo: "Seu acesso de professor",
      corpo:
        "Você recebeu um convite para usar o Coach In como professor. Toque no link para ativar seu acesso. O link vale por 1 dia e só pode ser usado uma vez.",
      botao: "Ativar acesso",
    };
  }
  return {
    assunto: `${quemConvidou} convidou você para o Coach In`,
    titulo: "Seu convite para o Coach In",
    corpo: `${quemConvidou} quer montar seus treinos no Coach In. Toque no link para criar seu acesso ou entrar com sua conta. O link vale por 7 dias e só pode ser usado uma vez.`,
    botao: "Abrir convite",
  };
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Texto puro e HTML, no mesmo formato dos e-mails de autenticação (email-templates-pt-br.md). */
export function montarEmail(tipo: Tipo, quemConvidou: string, link: string) {
  const t = textoDoConvite(tipo, quemConvidou);
  const texto = `${t.corpo}\n\n${t.botao}: ${link}\n\n${FECHO}`;
  const html = [
    `<h2>${escapar(t.titulo)}</h2>`,
    `<p>${escapar(t.corpo)}</p>`,
    `<p><a href="${escapar(link)}">${escapar(t.botao)}</a></p>`,
    `<p>${FECHO}</p>`,
  ].join("\n");
  return { assunto: t.assunto, texto, html };
}
