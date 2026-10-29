import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { Database } from "@db/database.types";
import { ErroApp, erroDaResposta, MENSAGENS } from "@/lib/erros";
import { email as esquemaEmail } from "@/lib/formularios";
import { rpc } from "@/lib/rpc";
import {
  BackButton,
  BarraFixa,
  Button,
  Chip,
  FormField,
  Notice,
  Tela,
  TextButton,
  useToast,
  type TomChip,
} from "@/ui";
import { dataCurta, estadoDoConvite } from "./conviteDoAluno";
import { ConviteGerado, type Convite } from "./ConviteGerado";

export type AlunoComConvite = {
  aluno: { id: string; nome: string; email: string | null };
  convite: Pick<
    Database["public"]["Tables"]["invites"]["Row"],
    "id" | "status" | "expires_at" | "created_at" | "declined_at"
  >;
};

const CHIP: Record<"pendente" | "expirado" | "recusado", { tom: TomChip; texto: string }> = {
  pendente: { tom: "info", texto: "Convite pendente" },
  expirado: { tom: "neutral", texto: "Convite expirado" },
  recusado: { tom: "neutral", texto: "Convite recusado" },
};

/**
 * Aluno com convite, na visão do professor (regras 55, 58 e 102; Figma "Professor · Alunos",
 * seções 4 e 6): pendente, corrigir e-mail, expirado e recusado. Toda ação gera um link novo
 * (`reissue_invite`, o anterior deixa de valer) e abre "Convite gerado".
 * Fora por ora (#64): "Copiar link" no pendente e o estado "já tem conta". Textos sobre o aluno
 * no masculino genérico até a decisão (#64).
 */
export function AlunoComConvitePage({
  aluno,
  convite,
  agora = new Date(),
}: AlunoComConvite & { agora?: Date }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [corrigindo, setCorrigindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [gerado, setGerado] = useState<Convite & { reenviado: boolean }>();
  const estado = estadoDoConvite(convite, agora);
  const voltar = () => navegar({ to: "/professor" });

  /** Gera o link novo; erro de campo volta para quem chamou, os demais viram toast. */
  async function reemitir(novoEmail?: string): Promise<ErroApp | undefined> {
    setEnviando(true);
    try {
      const resposta = (await rpc("reissue_invite", {
        p_invite_id: convite.id,
        ...(novoEmail ? { p_new_email: novoEmail } : {}),
      })) as { token: string };
      setGerado({
        nome: aluno.nome,
        comEmail: Boolean(novoEmail ?? aluno.email),
        token: resposta.token,
        reenviado: estado === "pendente",
      });
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      setEnviando(false);
      if (novoEmail && (erro.codigo === "email_invalid" || erro.codigo === "student_email_taken")) {
        return erro;
      }
      mostrarToast("error", erro.message);
    }
  }

  if (gerado) return <ConviteReemitido {...gerado} />;
  if (estado !== "pendente" && estado !== "expirado" && estado !== "recusado") {
    // Usado ou substituído: o aluno já ativou ou há um convite mais novo; a lista mostra o atual.
    return (
      <Cabecalho nome={aluno.nome} aoVoltar={voltar}>
        <Notice tom="neutral" titulo="Este convite não está mais ativo" />
      </Cabecalho>
    );
  }
  if (corrigindo && aluno.email) {
    return (
      <CorrigirEmail
        nome={aluno.nome}
        emailAtual={aluno.email}
        enviando={enviando}
        aoVoltar={() => setCorrigindo(false)}
        aoCorrigir={reemitir}
      />
    );
  }

  const textoDoEmail = aluno.email ?? "Sem e-mail no cadastro";
  const conteudo = {
    pendente: {
      titulo: `Convite válido até ${dataCurta(convite.expires_at)}`,
      texto: `Enviado em ${dataCurta(convite.created_at)}. O aluno ainda não criou o acesso.`,
      botao: "Reenviar convite",
    },
    expirado: {
      titulo: `Este convite expirou em ${dataCurta(convite.expires_at)}`,
      texto: "O link antigo não funciona mais. Gere um novo para ele criar o acesso.",
      botao: "Gerar novo convite",
    },
    recusado: {
      titulo: `Recusou o convite em ${dataCurta(convite.declined_at ?? convite.created_at)}`,
      texto:
        "Ele escolheu não vincular a conta agora e o link foi encerrado. Envie outro convite se quiser tentar de novo.",
      botao: "Enviar novo convite",
    },
  }[estado];

  return (
    <Cabecalho
      nome={aluno.nome}
      chip={CHIP[estado]}
      aoVoltar={voltar}
      botao={{ texto: conteudo.botao, aoTocar: () => void reemitir(), enviando }}
    >
      <div className="flex flex-col items-start">
        <p className="text-body text-text-secondary">{textoDoEmail}</p>
        {estado === "pendente" && aluno.email && (
          <TextButton onClick={() => setCorrigindo(true)}>Corrigir e-mail</TextButton>
        )}
      </div>
      <Notice tom="neutral" titulo={conteudo.titulo}>
        {conteudo.texto}
      </Notice>
    </Cabecalho>
  );
}

type CabecalhoProps = {
  nome: string;
  chip?: { tom: TomChip; texto: string };
  aoVoltar: () => void;
  botao?: { texto: string; aoTocar: () => void; enviando: boolean };
  children: ReactNode;
};

function Cabecalho({ nome, chip, aoVoltar, botao, children }: CabecalhoProps) {
  return (
    <Tela barra={botao ? "um" : undefined}>
      <BackButton onClick={aoVoltar} />
      <div className="flex flex-col items-start gap-8">
        <h1 className="w-full truncate text-title-screen">{nome}</h1>
        {chip && <Chip tom={chip.tom}>{chip.texto}</Chip>}
      </div>
      {children}
      {botao && (
        <BarraFixa>
          <Button onClick={botao.aoTocar} disabled={botao.enviando}>
            {botao.texto}
          </Button>
        </BarraFixa>
      )}
    </Tela>
  );
}

type CorrigirEmailProps = {
  nome: string;
  emailAtual: string;
  enviando: boolean;
  aoVoltar: () => void;
  aoCorrigir: (email: string) => Promise<ErroApp | undefined>;
};

/** "Corrigir e-mail" (regra 58): o novo link vai para o e-mail corrigido; o anterior para. */
function CorrigirEmail({ nome, emailAtual, enviando, aoVoltar, aoCorrigir }: CorrigirEmailProps) {
  const [valor, setValor] = useState(emailAtual);
  const [erro, setErro] = useState<string>();

  async function corrigir() {
    const lido = esquemaEmail.safeParse(valor);
    if (!lido.success) {
      setErro(MENSAGENS.email_invalid);
      return;
    }
    setErro(undefined);
    const falha = await aoCorrigir(lido.data);
    if (falha) setErro(falha.message);
  }

  return (
    <Cabecalho
      nome={nome}
      chip={CHIP.pendente}
      aoVoltar={aoVoltar}
      botao={{ texto: "Corrigir e reenviar", aoTocar: () => void corrigir(), enviando }}
    >
      <FormField
        rotulo="E-mail do convite"
        tipo="email"
        inputMode="email"
        autoComplete="off"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        erro={erro}
      />
      <Notice tom="info" titulo="O link anterior deixa de valer">
        O novo link vale por 7 dias. Confira o e-mail antes de reenviar.
      </Notice>
    </Cabecalho>
  );
}

/** "Convite gerado" com o toast "Convite reenviado." quando era um reenvio do pendente. */
function ConviteReemitido({ reenviado, ...convite }: Convite & { reenviado: boolean }) {
  const mostrarToast = useToast();
  useEffect(() => {
    if (reenviado) mostrarToast("success", "Convite reenviado.");
  }, [reenviado, mostrarToast]);
  return <ConviteGerado {...convite} />;
}
