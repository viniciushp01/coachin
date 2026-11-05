import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErroApp, erroDaResposta, MENSAGENS } from "@/lib/erros";
import { BackButton, BarraFixa, Button, FormField, Notice, Tela, useToast } from "@/ui";
import type { ExercicioDaBusca } from "./biblioteca";
import { CamposDoExercicio } from "./CamposDoExercicio";
import { criarExercicio, type ExercicioParecido, type ModoDeCarga } from "./exercicioNovo";
import type { Medida } from "./medida";

/** O "Digite seu nome." de `name_required` é do perfil (`src/lib/erros.ts`). */
const NOME_DO_EXERCICIO = "Digite o nome do exercício.";

/** Limite de `create_exercise` (migration do catálogo). */
const NOME_MAX_CARACTERES = 120;

const esquema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, NOME_DO_EXERCICIO)
    .max(NOME_MAX_CARACTERES, MENSAGENS.name_too_long),
});

/** Erros do servidor que pertencem ao campo do nome. */
const ERRO_NO_NOME: Record<string, string> = {
  name_required: NOME_DO_EXERCICIO,
  name_too_long: MENSAGENS.name_too_long,
  exercise_exists: MENSAGENS.exercise_exists,
};

type CriarExercicioProps = {
  nome: string;
  /** Com parecido, o aviso vem antes de "Novo exercício" (regra 151 (3)). */
  parecido: ExercicioParecido | null;
  aoVoltar: () => void;
  /** O exercício que entra na ficha: o existente ou o recém-criado. */
  aoEscolher: (exercicio: ExercicioDaBusca) => void;
};

/** Criar exercício a partir da busca (regras 32, 74, 123, 124, 151 e 157; Biblioteca · 2 e 5). */
export function CriarExercicio({ nome, parecido, aoVoltar, aoEscolher }: CriarExercicioProps) {
  const [criarMesmoAssim, setCriarMesmoAssim] = useState(false);

  if (parecido && !criarMesmoAssim) {
    return (
      <Tela barra={parecido.mesmoNome ? "um" : "dois"}>
        <BackButton onClick={aoVoltar} />
        <h1 className="text-title-screen">Novo exercício</h1>
        <FormField rotulo="Nome do exercício" value={nome} readOnly />
        <Notice
          tom="info"
          titulo={parecido.mesmoNome ? "Esse nome já existe" : "Já existe um exercício parecido"}
        >
          {parecido.nome} · {parecido.detalhe}.{" "}
          {parecido.mesmoNome
            ? "Use o existente ou volte e mude o nome."
            : "Usar o existente mantém o histórico de carga do aluno."}
        </Notice>
        <BarraFixa>
          <Button onClick={() => aoEscolher(parecido)}>Usar “{parecido.nome}”</Button>
          {!parecido.mesmoNome && (
            <Button variante="secondary" onClick={() => setCriarMesmoAssim(true)}>
              Criar mesmo assim
            </Button>
          )}
        </BarraFixa>
      </Tela>
    );
  }

  return <NovoExercicio nome={nome} aoVoltar={aoVoltar} aoCriar={aoEscolher} />;
}

function NovoExercicio({
  nome,
  aoVoltar,
  aoCriar,
}: {
  nome: string;
  aoVoltar: () => void;
  aoCriar: (exercicio: ExercicioDaBusca) => void;
}) {
  const idDoForm = useId();
  const mostrarToast = useToast();
  // Padrões da regra 123: repetições e "Sim".
  const [medida, setMedida] = useState<Medida>("reps");
  const [carga, setCarga] = useState<ModoDeCarga>("required");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nome },
  });

  async function criar(dados: z.infer<typeof esquema>) {
    try {
      aoCriar(await criarExercicio({ nome: dados.nome, medida, carga }));
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      const noNome = ERRO_NO_NOME[erro.codigo];
      if (noNome) setError("nome", { message: noNome }, { shouldFocus: true });
      else mostrarToast("error", erro.message);
    }
  }

  return (
    <Tela barra="dois">
      <BackButton onClick={aoVoltar} />
      <h1 className="text-title-screen">Novo exercício</h1>
      <form
        id={idDoForm}
        onSubmit={(e) => void handleSubmit(criar)(e)}
        className="flex flex-col gap-16"
        noValidate
      >
        <FormField
          rotulo="Nome do exercício"
          placeholder="Ex.: Supino inclinado"
          autoComplete="off"
          erro={errors.nome?.message}
          {...register("nome")}
        />
        <CamposDoExercicio
          medida={medida}
          carga={carga}
          aoMudarMedida={setMedida}
          aoMudarCarga={setCarga}
        />
      </form>
      <BarraFixa>
        <Button type="submit" form={idDoForm} disabled={isSubmitting}>
          Criar exercício
        </Button>
        <Button variante="secondary" onClick={aoVoltar}>
          Cancelar
        </Button>
      </BarraFixa>
    </Tela>
  );
}
