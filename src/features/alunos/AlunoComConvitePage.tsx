import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { email } from "@/lib/formularios";
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
import {
  CHIP_DO_ESTADO,
  dataCurta,
  estadoDoConvite,
  textoDaRecusa,
  type AlunoComConvite,
  type EstadoVisivel,
} from "./conviteDoAluno";
import { ConviteGerado, type LinkDoConvite } from "./ConviteGerado";

/** Texto de apoio do pendente (regra 142). */
const SEM_COPIAR_LINK =
  "O link só aparece quando é gerado: para pegar outro, toque em Reenviar convite (o anterior deixa de valer).";

/** Erros do reenvio que significam "este convite não vale mais": a área mostra o atual. */
const CONVITE_MUDOU = ["student_already_linked", "invite_used", "invite_replaced"];
/** Erros de "Corrigir e reenviar" que pertencem ao campo de e-mail. */
const ERRO_DO_EMAIL = ["email_invalid", "student_email_taken", "email_is_admin", "already_teacher"];

/** O que muda entre o convite de aluno (professor) e o de professor (administrador). */
export type Papel = "aluno" | "professor";
const POR_PAPEL = {
  aluno: {
    volta: "/professor",
    validade: "7 dias",
    pendente: "O aluno ainda não criou o acesso.",
    expirado: (nome: string) => `Gere um novo convite para ${nome} criar o acesso.`,
    recusado: () => "O link foi encerrado. Envie outro convite se quiser tentar de novo.",
  },
  // Texto neutro quanto a gênero (regra 144): o nome no lugar do pronome.
  professor: {
    volta: "/admin",
    validade: "1 dia",
    pendente: "A pessoa ainda não ativou o acesso.",
    expirado: (nome: string) => `Gere um novo convite para ${nome} ativar o acesso.`,
    recusado: (nome: string) =>
      `${nome} escolheu não ativar o acesso agora e o link foi encerrado. Envie outro convite se quiser tentar de novo.`,
  },
} as const;

/**
 * Aluno com convite, na visão do professor (regras 55, 58 e 102; Figma "Professor · Alunos",
 * seções 4 e 6): pendente, corrigir e-mail, expirado e recusado. Toda ação gera um link novo
 * (`reissue_invite`, o anterior deixa de valer) e abre "Convite gerado".
 * Pendente não tem "Copiar link": o banco só guarda o hash do token (regra 142). Não há estado
 * "já tem conta": o aluno com conta aparece como convite pendente (regra 143).
 */
export function AlunoComConvitePage({
  aluno,
  convite,
  agora = new Date(),
  papel = "aluno",
}: AlunoComConvite & { agora?: Date; papel?: Papel }) {
  const textos = POR_PAPEL[papel];
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const [corrigindo, setCorrigindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [gerado, setGerado] = useState<LinkDoConvite & { reenviado: boolean; papel: Papel }>();
  // A rota só abre esta tela com um estado visível (lerAlunoComConvite).
  const estado = estadoDoConvite(convite, agora) as EstadoVisivel;
  const voltar = () => navegar({ to: textos.volta });

  /** Gera o link novo. Erro do campo de e-mail volta para quem chamou; os demais viram toast. */
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
        papel,
        reenviado: estado === "pendente",
      });
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      setEnviando(false);
      if (novoEmail && ERRO_DO_EMAIL.includes(erro.codigo)) return erro;
      mostrarToast("error", erro.message);
      if (CONVITE_MUDOU.includes(erro.codigo)) void voltar();
    }
  }

  if (gerado) return <ConviteReemitido {...gerado} />;
  if (corrigindo && aluno.email) {
    return (
      <CorrigirEmail
        nome={aluno.nome}
        emailAtual={aluno.email}
        validade={textos.validade}
        enviando={enviando}
        aoVoltar={() => setCorrigindo(false)}
        aoCorrigir={reemitir}
      />
    );
  }

  const conteudo = {
    pendente: {
      titulo: `Convite válido até ${dataCurta(convite.expires_at)}`,
      texto: `Enviado em ${dataCurta(convite.created_at)}. ${textos.pendente}`,
      botao: "Reenviar convite",
    },
    expirado: {
      titulo: `Este convite expirou em ${dataCurta(convite.expires_at)}`,
      texto: `O link antigo não funciona mais. ${textos.expirado(aluno.nome)}`,
      botao: "Gerar novo convite",
    },
    recusado: {
      titulo: textoDaRecusa(convite),
      texto: textos.recusado(aluno.nome),
      botao: "Enviar novo convite",
    },
  }[estado];

  return (
    <Cabecalho
      nome={aluno.nome}
      chip={CHIP_DO_ESTADO[estado]}
      aoVoltar={voltar}
      botao={{ texto: conteudo.botao, aoTocar: () => void reemitir(), enviando }}
    >
      <div className="flex flex-col items-start">
        <p className="text-body text-text-secondary">{aluno.email ?? "Sem e-mail no cadastro"}</p>
        {estado === "pendente" && aluno.email && (
          <TextButton onClick={() => setCorrigindo(true)}>Corrigir e-mail</TextButton>
        )}
      </div>
      <Notice tom="neutral" titulo={conteudo.titulo}>
        {conteudo.texto}
      </Notice>
      {estado === "pendente" && (
        <p className="text-caption text-text-secondary">{SEM_COPIAR_LINK}</p>
      )}
    </Cabecalho>
  );
}

type CabecalhoProps = {
  nome: string;
  chip: { tom: TomChip; texto: string };
  aoVoltar: () => void;
  botao: { texto: string; aoTocar: () => void; enviando: boolean };
  children: ReactNode;
};

/** Nome, chip, conteúdo e o botão principal no rodapé (Figma "Convite do aluno"). */
function Cabecalho({ nome, chip, aoVoltar, botao, children }: CabecalhoProps) {
  return (
    <Tela barra="um">
      <BackButton onClick={aoVoltar} />
      <div className="flex flex-col items-start gap-8">
        <h1 className="w-full truncate text-title-screen">{nome}</h1>
        <Chip tom={chip.tom}>{chip.texto}</Chip>
      </div>
      {children}
      <BarraFixa>
        <Button onClick={botao.aoTocar} disabled={botao.enviando}>
          {botao.texto}
        </Button>
      </BarraFixa>
    </Tela>
  );
}

const esquemaDoEmail = z.object({ email });

type CorrigirEmailProps = {
  nome: string;
  emailAtual: string;
  validade: string;
  enviando: boolean;
  aoVoltar: () => void;
  aoCorrigir: (email: string) => Promise<ErroApp | undefined>;
};

/** "Corrigir e-mail" (regra 58): o novo link vai para o e-mail corrigido; o anterior para. */
function CorrigirEmail({
  nome,
  emailAtual,
  validade,
  enviando,
  aoVoltar,
  aoCorrigir,
}: CorrigirEmailProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaDoEmail), defaultValues: { email: emailAtual } });

  async function corrigir(dados: z.infer<typeof esquemaDoEmail>) {
    const falha = await aoCorrigir(dados.email);
    if (falha) setError("email", { message: falha.message }, { shouldFocus: true });
  }

  return (
    <Cabecalho
      nome={nome}
      chip={CHIP_DO_ESTADO.pendente}
      aoVoltar={aoVoltar}
      botao={{
        texto: "Corrigir e reenviar",
        aoTocar: () => void handleSubmit(corrigir)(),
        enviando,
      }}
    >
      <FormField
        rotulo="E-mail do convite"
        tipo="email"
        inputMode="email"
        autoComplete="off"
        erro={errors.email?.message}
        {...register("email")}
      />
      <Notice tom="info" titulo="O link anterior deixa de valer">
        O novo link vale por {validade}. Confira o e-mail antes de reenviar.
      </Notice>
    </Cabecalho>
  );
}

/** "Convite gerado" com o toast "Convite reenviado." quando era um reenvio do pendente. */
function ConviteReemitido({
  reenviado,
  papel,
  ...link
}: LinkDoConvite & { reenviado: boolean; papel: Papel }) {
  const mostrarToast = useToast();
  useEffect(() => {
    if (reenviado) mostrarToast("success", "Convite reenviado.");
  }, [reenviado, mostrarToast]);
  return <ConviteGerado papel={papel} {...link} />;
}
