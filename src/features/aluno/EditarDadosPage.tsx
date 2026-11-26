import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { PerfilDoAluno } from "@/features/acompanhar/dados";
import { alturaEmTexto, pesoEmTexto } from "@/features/acompanhar/logica";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { esquemaDoPerfil, formatarTelefone, mascararData, telefoneDoServidor } from "@/lib/perfil";
import { rpc } from "@/lib/rpc";
import {
  BackButton,
  BarraFixa,
  Button,
  DataField,
  FormField,
  Notice,
  PhoneField,
  Tela,
  TextAreaField,
  useToast,
} from "@/ui";

/** Erros do servidor que pertencem a um campo do perfil (os mesmos da validação no app). */
const CAMPO_DO_ERRO = {
  name_required: "nome",
  birth_date_invalid: "nascimento",
  phone_invalid: "telefone",
  height_invalid: "altura",
  weight_invalid: "peso",
} as const;

const paraCampo = (iso: string | null) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";

/**
 * "Editar dados" (Figma "Perfil · 2" e "Perfil · 6"; regras 85, 99 e 108): os mesmos campos e
 * erros do passo 2 do primeiro acesso, preenchidos com o que já está salvo. Sem conexão, mostra o
 * aviso, mantém o que foi digitado e deixa "Salvar alterações" habilitado (regra 116).
 */
export function EditarDadosPage({ perfil }: { perfil: PerfilDoAluno }) {
  const navegar = useNavigate();
  const mostrarToast = useToast();
  const { aluno } = perfil;
  const [semConexao, setSemConexao] = useState(false);
  const telefone = telefoneDoServidor(perfil.telefone);
  const esquema = useMemo(() => esquemaDoPerfil(aluno.hoje), [aluno.hoje]);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: aluno.nome,
      nascimento: paraCampo(perfil.nascimento),
      codigoPais: telefone.codigo,
      telefone: telefone.numero,
      altura: perfil.altura !== null ? alturaEmTexto(perfil.altura) : "",
      peso: perfil.peso !== null ? pesoEmTexto(perfil.peso) : "",
      restricoes: perfil.restricoes ?? "",
    },
  });
  const codigoPais = useWatch({ control, name: "codigoPais" });

  async function salvar(dados: Parameters<typeof rpc<"save_student_profile">>[1]) {
    setSemConexao(false);
    try {
      await rpc("save_student_profile", dados);
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      const campo = CAMPO_DO_ERRO[erro.codigo as keyof typeof CAMPO_DO_ERRO];
      if (campo) setError(campo, { message: erro.message }, { shouldFocus: true });
      else if (erro.codigo === "sem_conexao") setSemConexao(true);
      else mostrarToast("error", erro.message);
      return;
    }
    mostrarToast("success", "Dados atualizados.");
    await navegar({ to: "/aluno/perfil", replace: true });
  }

  return (
    <Tela barra="um" logo={false}>
      <form
        id="editar-dados"
        onSubmit={handleSubmit(salvar)}
        className="flex flex-col gap-16"
        noValidate
      >
        <BackButton onClick={() => void navegar({ to: "/aluno/perfil" })} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Editar dados</h1>
          <p className="text-body text-text-secondary">
            Seu professor vê estes dados para montar o seu treino e falar com você.
          </p>
        </div>
        {semConexao && (
          <Notice tom="neutral" titulo="Sem conexão">
            O que você digitou continua aqui. Salve de novo quando a conexão voltar.
          </Notice>
        )}
        <FormField
          rotulo="Nome"
          autoComplete="name"
          erro={errors.nome?.message}
          {...register("nome")}
        />
        <DataField
          rotulo="Data de nascimento"
          autoComplete="bday"
          max={aluno.hoje}
          aoEscolherData={(texto) => setValue("nascimento", texto, { shouldValidate: true })}
          erro={errors.nascimento?.message}
          {...register("nascimento", {
            onChange: (e: { target: HTMLInputElement }) =>
              setValue("nascimento", mascararData(e.target.value)),
          })}
        />
        <PhoneField
          rotulo="Telefone (WhatsApp)"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 91234-5678"
          codigoPais={codigoPais}
          aoMudarCodigoPais={(codigo) => setValue("codigoPais", codigo)}
          erro={errors.telefone?.message}
          {...register("telefone", {
            onChange: (e: { target: HTMLInputElement }) =>
              setValue("telefone", formatarTelefone(codigoPais, e.target.value)),
          })}
        />
        <FormField
          rotulo="Altura"
          inputMode="decimal"
          placeholder="Ex.: 1,78 m"
          erro={errors.altura?.message}
          {...register("altura")}
        />
        <FormField
          rotulo="Peso"
          inputMode="decimal"
          placeholder="Ex.: 78,5 kg"
          erro={errors.peso?.message}
          {...register("peso")}
        />
        <TextAreaField
          rotulo="Restrições ou dores (opcional)"
          placeholder="Ex.: dor leve no ombro direito"
          {...register("restricoes")}
        />
      </form>
      <BarraFixa>
        <Button type="submit" form="editar-dados" disabled={isSubmitting}>
          Salvar alterações
        </Button>
      </BarraFixa>
    </Tela>
  );
}
