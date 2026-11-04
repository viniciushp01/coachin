import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, FormField, Sheet, TextAreaField, TextButton } from "@/ui";
import type { Medida } from "./medida";
import { esquemaDoExercicio, type ValoresDoExercicio } from "./rascunho";

type FolhaDoExercicioProps = {
  nome: string;
  medida: Medida;
  /** Exercício já na ficha; sem ele, os campos começam vazios (regra 149 (4)). */
  inicial?: ValoresDoExercicio;
  aoFechar: () => void;
  aoSalvar: (valores: ValoresDoExercicio) => void;
  /** Só para quem já está na ficha, e sem confirmação (regra 149 (1)). */
  aoRemover?: () => void;
};

/** Folha "Editar exercício" (regras 73, 124 e 149; Figma "Editar exercício · 1 e 2"). */
export function FolhaDoExercicio({
  nome,
  medida,
  inicial,
  aoFechar,
  aoSalvar,
  aoRemover,
}: FolhaDoExercicioProps) {
  const idDoForm = useId();
  const [esquema] = useState(() => esquemaDoExercicio(medida));
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      series: inicial ? String(inicial.series) : "",
      reps: inicial?.reps ?? "",
      descanso: inicial?.descanso ? `${inicial.descanso} s` : "",
      observacao: inicial?.observacao ?? "",
    },
  });
  const tempo = medida === "time";

  return (
    <Sheet
      aberta
      aoFechar={aoFechar}
      titulo={nome}
      acoes={
        <>
          <Button type="submit" form={idDoForm}>
            Salvar exercício
          </Button>
          {aoRemover && (
            <TextButton tom="muted" className="self-start" onClick={aoRemover}>
              Remover exercício
            </TextButton>
          )}
        </>
      }
    >
      <form
        id={idDoForm}
        onSubmit={(e) => void handleSubmit(aoSalvar)(e)}
        className="flex flex-col gap-16"
        noValidate
      >
        <FormField
          rotulo="Séries"
          placeholder="Ex.: 4"
          inputMode="numeric"
          autoComplete="off"
          erro={errors.series?.message}
          {...register("series")}
        />
        <FormField
          rotulo={tempo ? "Tempo" : "Repetições"}
          placeholder={tempo ? "Ex.: 30 s" : "Ex.: 10 ou 8-12"}
          autoComplete="off"
          maxLength={20}
          erro={errors.reps?.message}
          {...register("reps")}
        />
        <FormField
          rotulo="Descanso (informativo)"
          placeholder="Ex.: 60 s (opcional)"
          autoComplete="off"
          erro={errors.descanso?.message}
          {...register("descanso")}
        />
        <TextAreaField
          rotulo="Observação (opcional)"
          placeholder="Ex.: Controle a descida"
          {...register("observacao")}
        />
      </form>
    </Sheet>
  );
}
