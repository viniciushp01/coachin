import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConviteGerado, type LinkDoConvite } from "@/features/alunos/ConviteGerado";
import { ErroApp, erroDaResposta, MENSAGENS } from "@/lib/erros";
import { email } from "@/lib/formularios";
import { rpc } from "@/lib/rpc";
import { BackButton, BarraFixa, Button, FormField, Notice, Tela, useToast } from "@/ui";

/** Nome vazio (proposta, no padrão do "Digite o nome do aluno." do cadastro do aluno). */
const NOME_DO_PROFESSOR = "Digite o nome do professor.";

/** Formulário → argumentos de `create_teacher_invite` (regra 92: nome e e-mail obrigatórios). */
const esquema = z.object({
  p_name: z.string().trim().min(1, NOME_DO_PROFESSOR),
  p_email: email,
});

/** Erros do servidor que pertencem a um campo. */
const CAMPO_DO_ERRO = {
  name_required: ["p_name", NOME_DO_PROFESSOR],
  email_invalid: ["p_email", MENSAGENS.email_invalid],
  email_is_admin: ["p_email", MENSAGENS.email_is_admin],
  already_teacher: ["p_email", MENSAGENS.already_teacher],
} as const;

/**
 * Convidar professor e "Convite gerado" (regras 87 e 92; Figma "Admin · Professores", seção 1).
 * O link fica só na memória da tela: copiar é o caminho até o envio por e-mail (#52).
 */
export function ConvidarProfessorPage() {
  const [convite, setConvite] = useState<LinkDoConvite>();
  return convite ? (
    <ConviteGerado papel="professor" {...convite} />
  ) : (
    <Convidar aoGerar={setConvite} />
  );
}

function Convidar({ aoGerar }: { aoGerar: (convite: LinkDoConvite) => void }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { p_name: "", p_email: "" },
  });

  async function gerar(dados: z.infer<typeof esquema>) {
    let resposta: unknown;
    try {
      resposta = await rpc("create_teacher_invite", dados);
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      const campo = CAMPO_DO_ERRO[erro.codigo as keyof typeof CAMPO_DO_ERRO];
      if (campo) setError(campo[0], { message: campo[1] }, { shouldFocus: true });
      else mostrarToast("error", erro.message);
      return;
    }
    const { token } = resposta as { token: string };
    aoGerar({ nome: dados.p_name, comEmail: true, token });
  }

  return (
    <Tela barra="um">
      <form
        id="convidar"
        onSubmit={handleSubmit(gerar)}
        className="flex flex-col gap-16"
        noValidate
      >
        <BackButton onClick={() => navegar({ to: "/admin" })} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Convidar professor</h1>
          {/* Regra 144: o Figma diz "ela passa a ser professor"; reescrito sem pronome. */}
          <p className="text-body text-text-secondary">
            O convite vale só para o e-mail informado. Se a pessoa já tem conta, a conta passa a ser
            de professor.
          </p>
        </div>
        <FormField
          rotulo="Nome"
          placeholder="Nome do professor"
          autoComplete="off"
          erro={errors.p_name?.message}
          {...register("p_name")}
        />
        <FormField
          rotulo="E-mail"
          tipo="email"
          inputMode="email"
          autoComplete="off"
          placeholder="nome@exemplo.com"
          erro={errors.p_email?.message}
          {...register("p_email")}
        />
        <Notice tom="neutral" titulo="Atenção">
          Se este e-mail já tiver conta de aluno, o acesso de aluno será encerrado. Os dados de
          treino ficam guardados, sem acesso.
        </Notice>
      </form>
      <BarraFixa>
        <Button type="submit" form="convidar" disabled={isSubmitting}>
          Gerar convite
        </Button>
      </BarraFixa>
    </Tela>
  );
}
