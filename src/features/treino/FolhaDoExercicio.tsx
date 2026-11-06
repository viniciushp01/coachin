import { useId, useState, type ReactNode } from "react";
import { Button, FormField, NumberField, QuickPick, Sheet, TextAreaField, TextButton } from "@/ui";
import {
  ATALHOS_DE_DESCANSO,
  atalhoDoDescanso,
  camposIniciais,
  descansoEmOutro,
  soDigitos,
  trocarModo,
  type CamposDoExercicio,
  type ModoDasReps,
} from "./camposDaFolha";
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

type Erros = Partial<Record<"series" | "reps" | "descanso", string>>;

const rotuloCampo = "text-label text-text-secondary";
const textoDeErro = "text-caption text-status-danger";

function Coluna({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-8">{children}</div>;
}

function Erro({ id, texto }: { id: string; texto?: string }) {
  return texto ? (
    <p id={id} className={textoDeErro}>
      {texto}
    </p>
  ) : null;
}

/**
 * Folha "Editar exercício" (regras 73, 124, 149 e 159; Figma "Professor · Treino", seção 10, A1 a
 * A5): séries e repetições (ou tempo) lado a lado, repetições em três modos e descanso em atalhos.
 */
export function FolhaDoExercicio({
  nome,
  medida,
  inicial,
  aoFechar,
  aoSalvar,
  aoRemover,
}: FolhaDoExercicioProps) {
  const idDoForm = useId();
  const idSeries = useId();
  const idReps = useId();
  const idDoDescanso = useId();
  const [esquema] = useState(() => esquemaDoExercicio(medida));
  const [campos, setCampos] = useState(() => camposIniciais(inicial, medida));
  const [outroAberto, setOutroAberto] = useState(() => descansoEmOutro(inicial?.descanso ?? 0));
  const [erros, setErros] = useState<Erros>({});
  const tempo = medida === "time";
  const rotuloReps = tempo ? "Tempo" : "Repetições";
  const { modo } = campos;

  const mudar = (parcial: Partial<CamposDoExercicio>, campoDoErro?: keyof Erros) => {
    setCampos((c) => ({ ...c, ...parcial }));
    if (campoDoErro) setErros((e) => ({ ...e, [campoDoErro]: undefined }));
  };
  const trocar = (novo: ModoDasReps) => {
    setCampos((c) => trocarModo(c, novo));
    setErros((e) => ({ ...e, reps: undefined }));
  };

  const atalho = atalhoDoDescanso(campos.descanso);
  const outroMarcado = outroAberto && atalho === undefined;

  // Tocar no atalho escolhido limpa o descanso; "Outro" abre o campo (regra 159 (4)).
  const tocarAtalho = (segundos: number) => {
    mudar({ descanso: atalho === segundos ? "" : String(segundos) }, "descanso");
    setOutroAberto(false);
  };
  const tocarOutro = () => {
    mudar({ descanso: "" }, "descanso");
    setOutroAberto(!outroMarcado);
  };

  function salvar() {
    const lido = esquema.safeParse(campos);
    if (lido.success) return aoSalvar(lido.data);
    const novos: Erros = {};
    for (const problema of lido.error.issues) {
      const campo = problema.path[0] as keyof Erros;
      novos[campo] ??= problema.message;
    }
    setErros(novos);
  }

  const campoSeries = (
    <Coluna>
      <label htmlFor={idSeries} className={rotuloCampo}>
        Séries
      </label>
      <NumberField
        id={idSeries}
        placeholder="Ex.: 4"
        maxLength={2}
        value={campos.series}
        invalido={!!erros.series}
        aria-describedby={erros.series ? `${idSeries}-erro` : undefined}
        onChange={(e) => mudar({ series: soDigitos(e.target.value) }, "series")}
      />
      <Erro id={`${idSeries}-erro`} texto={erros.series} />
    </Coluna>
  );

  const idErroReps = `${idReps}-erro`;
  const campoReps =
    modo === "faixa" ? (
      <Coluna>
        <span className={rotuloCampo}>{rotuloReps}</span>
        <div className="flex items-center gap-8">
          <NumberField
            formato="center"
            aria-label={`${rotuloReps}, mínimo`}
            aria-describedby={erros.reps ? idErroReps : undefined}
            placeholder="8"
            maxLength={3}
            value={campos.reps}
            invalido={!!erros.reps}
            onChange={(e) => mudar({ reps: soDigitos(e.target.value) }, "reps")}
          />
          <span aria-hidden="true" className="shrink-0 text-body">
            a
          </span>
          <NumberField
            formato="center"
            aria-label={`${rotuloReps}, máximo`}
            aria-describedby={erros.reps ? idErroReps : undefined}
            placeholder="12"
            maxLength={3}
            value={campos.repsMax}
            invalido={!!erros.reps}
            onChange={(e) => mudar({ repsMax: soDigitos(e.target.value) }, "reps")}
          />
          {tempo && (
            <span aria-hidden="true" className="shrink-0 text-text-secondary">
              s
            </span>
          )}
        </div>
        <Erro id={idErroReps} texto={erros.reps} />
      </Coluna>
    ) : modo === "fixo" ? (
      <Coluna>
        <label htmlFor={idReps} className={rotuloCampo}>
          {rotuloReps}
        </label>
        <NumberField
          id={idReps}
          formato={tempo ? "suffix" : "left"}
          placeholder={tempo ? "Ex.: 30" : "Ex.: 10"}
          maxLength={3}
          value={campos.reps}
          invalido={!!erros.reps}
          aria-describedby={erros.reps ? idErroReps : undefined}
          onChange={(e) => mudar({ reps: soDigitos(e.target.value) }, "reps")}
        />
        <Erro id={idErroReps} texto={erros.reps} />
      </Coluna>
    ) : (
      <FormField
        id={idReps}
        rotulo={rotuloReps}
        placeholder={tempo ? "Ex.: 30 s ou 45-60 s" : "Ex.: 10 ou 8-12"}
        autoComplete="off"
        maxLength={20}
        value={campos.reps}
        erro={erros.reps}
        onChange={(e) => mudar({ reps: e.target.value }, "reps")}
      />
    );

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
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
        className="flex flex-col gap-16"
        noValidate
      >
        {modo === "outro" ? (
          <>
            {campoSeries}
            {campoReps}
          </>
        ) : (
          <div className="grid grid-cols-2 items-start gap-16">
            {campoSeries}
            {campoReps}
          </div>
        )}

        <div className="-mt-8 flex justify-end gap-24">
          {modo !== "fixo" && (
            <TextButton tom="muted" onClick={() => trocar("fixo")}>
              {modo === "outro" ? "Voltar para número" : "Número fixo"}
            </TextButton>
          )}
          {modo === "fixo" && (
            <TextButton tom="muted" onClick={() => trocar("faixa")}>
              Usar faixa
            </TextButton>
          )}
          {modo !== "outro" && (
            <TextButton tom="muted" onClick={() => trocar("outro")}>
              Outro formato
            </TextButton>
          )}
        </div>

        <div role="group" aria-labelledby={idDoDescanso} className="flex flex-col gap-8">
          <span id={idDoDescanso} className={rotuloCampo}>
            Descanso (informativo)
          </span>
          <div className="grid grid-cols-3 gap-8">
            {ATALHOS_DE_DESCANSO.map((segundos) => (
              <QuickPick
                key={segundos}
                selecionado={atalho === segundos}
                onClick={() => tocarAtalho(segundos)}
              >
                {segundos} s
              </QuickPick>
            ))}
            <QuickPick selecionado={outroMarcado} onClick={tocarOutro}>
              Outro
            </QuickPick>
          </div>
          {outroAberto && (
            <div className="flex w-1/2 flex-col gap-8 pr-8">
              <NumberField
                formato="suffix"
                aria-label="Descanso, em segundos"
                aria-describedby={erros.descanso ? `${idDoDescanso}-erro` : undefined}
                maxLength={3}
                value={campos.descanso}
                invalido={!!erros.descanso}
                onChange={(e) => mudar({ descanso: soDigitos(e.target.value) }, "descanso")}
              />
              <Erro id={`${idDoDescanso}-erro`} texto={erros.descanso} />
            </div>
          )}
        </div>

        <TextAreaField
          rotulo="Observação (opcional)"
          placeholder="Ex.: Controle a descida"
          value={campos.observacao}
          onChange={(e) => mudar({ observacao: e.target.value })}
        />
      </form>
    </Sheet>
  );
}
