import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { VinculoAtivo } from "@/lib/vinculo";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { esquemaDoPerfil, formatarTelefone, telefoneDoServidor } from "@/lib/perfil";
import { rpc } from "@/lib/rpc";
import { estadoSessaoQuery } from "@/lib/sessao";
import {
  BarraFixa,
  Button,
  CheckboxRow,
  FormField,
  IconButton,
  Notice,
  PhoneField,
  StepIndicator,
  Tela,
  TextAreaField,
  useToast,
} from "@/ui";

type PrimeiroAcessoPageProps = {
  vinculo: VinculoAtivo;
  /** O passo 1 já foi confirmado antes: retoma no passo 2 (regra 86). */
  avisoAceito: boolean;
  /** Data de hoje no aparelho ("aaaa-mm-dd"), limite do nascimento (regra 85). */
  hoje: string;
};

/**
 * Primeiro acesso em 2 passos, ao vincular o primeiro professor (regras 49, 84 a 86, 91, 99, 108 e
 * 109; Figma "Aluno · Entrada", seção 4). Sem navegação inferior. O passo 1 grava o aceite do aviso;
 * o que for digitado no passo 2 só é gravado em "Concluir".
 */
export function PrimeiroAcessoPage({ vinculo, avisoAceito, hoje }: PrimeiroAcessoPageProps) {
  const [passo, setPasso] = useState<1 | 2>(avisoAceito ? 2 : 1);
  const [aceito, setAceito] = useState(avisoAceito);
  // O passo 2 fica montado depois de aberto: voltar ao aviso não apaga o que foi digitado.
  return (
    <>
      {passo === 1 && (
        <PassoAviso
          professor={vinculo.professor}
          jaAceito={aceito}
          aoContinuar={() => {
            setAceito(true);
            setPasso(2);
          }}
        />
      )}
      {aceito && (
        <div hidden={passo !== 2}>
          <PassoPerfil vinculo={vinculo} hoje={hoje} aoVoltar={() => setPasso(1)} />
        </div>
      )}
    </>
  );
}

type PassoAvisoProps = { professor: string; jaAceito: boolean; aoContinuar: () => void };

function PassoAviso({ professor, jaAceito, aoContinuar }: PassoAvisoProps) {
  const queryClient = useQueryClient();
  const mostrarToast = useToast();
  const [marcada, setMarcada] = useState(jaAceito);
  const [enviando, setEnviando] = useState(false);

  async function continuar() {
    // A confirmação fica salva com a data, para retomar no passo 2 (regra 86).
    if (!jaAceito) {
      setEnviando(true);
      try {
        await rpc("accept_data_notice");
      } catch (causa) {
        mostrarToast("error", erroDaResposta(causa).message);
        setEnviando(false);
        return;
      }
      // A sessão guarda se o aviso foi aceito: relida, quem voltar aqui retoma no passo 2.
      queryClient.removeQueries({ queryKey: estadoSessaoQuery.queryKey });
    }
    aoContinuar();
  }

  return (
    <Tela barra="um">
      <StepIndicator passo={1} total={2} />
      <h1 className="text-title-screen">Antes de começar</h1>
      <Notice tom="info" titulo="Seu professor vê estes dados">
        O Prof. {professor} vê seu nome, nascimento, telefone, altura, peso e restrições ou dores
        para montar o seu treino e falar com você. Altura e peso podem ser compartilhados em
        qualquer idade, mas é importante saber que o professor os vê. Restrições ou dores são dados
        de saúde e recebem cuidado especial, conforme a LGPD.
      </Notice>
      <CheckboxRow checked={marcada} onChange={(e) => setMarcada(e.target.checked)}>
        Li e entendi que o professor acessa esses dados para montar o meu treino.
      </CheckboxRow>
      <BarraFixa>
        <Button onClick={() => void continuar()} disabled={!marcada || enviando}>
          Continuar
        </Button>
      </BarraFixa>
    </Tela>
  );
}

/** Erros do servidor que pertencem a um campo do perfil (os mesmos da validação no app). */
const CAMPO_DO_ERRO = {
  name_required: "nome",
  birth_date_invalid: "nascimento",
  phone_invalid: "telefone",
  height_invalid: "altura",
  weight_invalid: "peso",
} as const;

type PassoPerfilProps = { vinculo: VinculoAtivo; hoje: string; aoVoltar: () => void };

function PassoPerfil({ vinculo, hoje, aoVoltar }: PassoPerfilProps) {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const mostrarToast = useToast();
  const telefone = telefoneDoServidor(vinculo.telefone);
  const esquema = useMemo(() => esquemaDoPerfil(hoje), [hoje]);
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
      nome: vinculo.nome,
      nascimento: "",
      codigoPais: telefone.codigo,
      telefone: telefone.numero,
      altura: "",
      peso: "",
      restricoes: "",
    },
  });
  const codigoPais = useWatch({ control, name: "codigoPais" });

  async function concluir(perfil: Parameters<typeof rpc<"save_student_profile">>[1]) {
    try {
      await rpc("save_student_profile", perfil);
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      const campo = CAMPO_DO_ERRO[erro.codigo as keyof typeof CAMPO_DO_ERRO];
      if (campo) setError(campo, { message: erro.message }, { shouldFocus: true });
      else mostrarToast("error", erro.message);
      return;
    }
    // Perfil concluído muda o destino (início ou "sem treino"): a sessão é lida de novo.
    queryClient.removeQueries({ queryKey: estadoSessaoQuery.queryKey });
    await navegar({ to: "/", replace: true });
  }

  return (
    <Tela barra="um">
      <form
        id="perfil"
        onSubmit={handleSubmit(concluir)}
        className="flex flex-col gap-16"
        noValidate
      >
        <IconButton icone="chevron_left" rotulo="Voltar" onClick={aoVoltar} />
        <StepIndicator passo={2} total={2} />
        <div className="flex flex-col gap-8">
          <h1 className="text-title-screen">Seu perfil</h1>
          <p className="text-body text-text-secondary">
            Preencha com calma. Você pode editar esses dados quando quiser.
          </p>
        </div>
        <FormField
          rotulo="Nome"
          autoComplete="name"
          erro={errors.nome?.message}
          {...register("nome")}
        />
        <FormField
          rotulo="Data de nascimento"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          erro={errors.nascimento?.message}
          {...register("nascimento")}
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
        <Button type="submit" form="perfil" disabled={isSubmitting}>
          Concluir
        </Button>
      </BarraFixa>
    </Tela>
  );
}
