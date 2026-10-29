import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ErroApp, erroDaResposta, MENSAGENS } from "@/lib/erros";
import { email } from "@/lib/formularios";
import { formatarTelefone, telefoneParaServidor } from "@/lib/perfil";
import { rpc } from "@/lib/rpc";
import { ConviteGerado, type LinkDoConvite } from "./ConviteGerado";
import { BarraFixa, BackButton, Button, FormField, Notice, PhoneField, Tela, useToast } from "@/ui";

/** Nome vazio no cadastro do aluno (Figma "Cadastrar · 2"); o "Digite seu nome." é do perfil. */
const NOME_DO_ALUNO = "Digite o nome do aluno.";

/** Cadastro → argumentos de `create_student_with_invite` (regras 57 e 109). */
const esquema = z
  .object({ nome: z.string(), email: z.string(), codigoPais: z.string(), telefone: z.string() })
  .transform((v, ctx) => {
    const erro = (campo: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [campo], message });
    const nome = v.nome.trim();
    if (!nome) erro("nome", NOME_DO_ALUNO);
    const temEmail = v.email.trim() !== "";
    const emailLido = email.safeParse(v.email);
    if (temEmail && !emailLido.success) erro("email", MENSAGENS.email_invalid);
    const temTelefone = v.telefone.replace(/\D/g, "") !== "";
    const telefone = temTelefone ? telefoneParaServidor(v.codigoPais, v.telefone) : null;
    if (temTelefone && !telefone) erro("telefone", MENSAGENS.phone_invalid);
    return {
      p_name: nome,
      ...(temEmail && emailLido.success ? { p_email: emailLido.data } : {}),
      ...(telefone ? { p_phone: telefone } : {}),
    };
  });

/**
 * Cadastrar aluno e "Convite gerado" (regras 46, 57 e 109; Figma "Professor · Alunos", seções 2
 * e 3). O link do convite fica só na memória da tela: copiar é o caminho até o envio por e-mail
 * (#52).
 */
export function CadastrarAlunoPage() {
  const [convite, setConvite] = useState<LinkDoConvite>();
  return convite ? <ConviteGerado {...convite} /> : <Cadastro aoGerar={setConvite} />;
}

/** Erros do servidor que pertencem a um campo do cadastro. */
const CAMPO_DO_ERRO = {
  name_required: ["nome", NOME_DO_ALUNO],
  email_invalid: ["email", MENSAGENS.email_invalid],
  student_email_taken: ["email", MENSAGENS.student_email_taken],
  phone_invalid: ["telefone", MENSAGENS.phone_invalid],
} as const;

function Cadastro({ aoGerar }: { aoGerar: (convite: LinkDoConvite) => void }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nome: "", email: "", codigoPais: "+55", telefone: "" },
  });
  const codigoPais = useWatch({ control, name: "codigoPais" });

  async function gerar(dados: z.infer<typeof esquema>) {
    let resposta: unknown;
    try {
      resposta = await rpc("create_student_with_invite", dados);
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      const campo = CAMPO_DO_ERRO[erro.codigo as keyof typeof CAMPO_DO_ERRO];
      if (campo) setError(campo[0], { message: campo[1] }, { shouldFocus: true });
      else mostrarToast("error", erro.message);
      return;
    }
    const { token } = resposta as { token: string };
    aoGerar({ nome: dados.p_name, comEmail: "p_email" in dados, token });
  }

  return (
    <Tela barra="um">
      <form
        id="cadastro"
        onSubmit={handleSubmit(gerar)}
        className="flex flex-col gap-16"
        noValidate
      >
        <BackButton onClick={() => navegar({ to: "/professor" })} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Cadastrar aluno</h1>
          <p className="text-body text-text-secondary">
            Depois você gera o convite para ele criar o acesso.
          </p>
        </div>
        <FormField
          rotulo="Nome"
          placeholder="Nome do aluno"
          autoComplete="off"
          erro={errors.nome?.message}
          {...register("nome")}
        />
        <FormField
          rotulo="E-mail (opcional)"
          tipo="email"
          inputMode="email"
          autoComplete="off"
          placeholder="nome@exemplo.com"
          erro={errors.email?.message}
          {...register("email")}
        />
        <PhoneField
          rotulo="Telefone (opcional)"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 91234-5678"
          codigoPais={codigoPais}
          aoMudarCodigoPais={(codigo) => setValue("codigoPais", codigo)}
          erro={errors.telefone?.message}
          {...register("telefone", {
            onChange: (e: { target: HTMLInputElement }) =>
              setValue("telefone", formatarTelefone(codigoPais, e.target.value)),
          })}
        />
        <Notice tom="neutral" titulo="Sem e-mail? Sem problema">
          Você pode enviar o link do convite por WhatsApp. O aluno escolhe o e-mail do acesso.
        </Notice>
      </form>
      <BarraFixa>
        <Button type="submit" form="cadastro" disabled={isSubmitting}>
          Gerar convite
        </Button>
      </BarraFixa>
    </Tela>
  );
}
