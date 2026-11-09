import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ErroApp } from "@/lib/erros";
import { BackButton, BarraFixa, Button, Chip, Tela, TextButton, useToast } from "@/ui";
import { desfazerMarcacao, marcarComoFeito, salvarCarga, type SituacaoDoEnvio } from "./acoes";
import { AVISO_GUARDADO } from "./textos";
import type { ExercicioDaFicha, TreinoDoAluno } from "./dados";
import { FolhaCarga } from "./FolhaCarga";
import { diaDaEdicao, fichaDeHoje, textoDaCarga, textoDaSerie } from "./logica";

/**
 * Ficha do aluno (Figma "Aluno · Ficha e painel do dia", Ficha · 1 a 4; regras 19 a 29, 123 e 124).
 * Sem "Iniciar treino" e sem cronômetro: o descanso é só informação (regra 25).
 */
export function FichaPage({
  treino,
  fichaId,
  offline = false,
}: {
  treino: TreinoDoAluno;
  fichaId: string;
  /** Mostrando a cópia guardada no aparelho (regra 116). */
  offline?: boolean;
}) {
  const navegar = useNavigate();
  const router = useRouter();
  const mostrarToast = useToast();
  const [carga, setCarga] = useState<ExercicioDaFicha | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ficha = treino.fichas.find((f) => f.id === fichaId);
  const voltar = () => void navegar({ to: "/aluno" });

  async function agir(acao: () => Promise<SituacaoDoEnvio>, sucesso: string) {
    setOcupado(true);
    try {
      const situacao = await acao();
      await router.invalidate();
      mostrarToast("success", situacao === "guardado" ? AVISO_GUARDADO : sucesso);
      return true;
    } catch (erro) {
      mostrarToast("error", erro instanceof ErroApp ? erro.message : "Não foi possível salvar.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  if (!ficha) {
    return (
      <Tela logo={false}>
        <BackButton onClick={voltar} />
        <p className="text-body text-text-secondary">Esta ficha não existe mais.</p>
      </Tela>
    );
  }

  const eDeHoje = fichaDeHoje(treino.fichas, treino.marcacoes)?.id === ficha.id;
  const marcacaoDeHoje = treino.marcacoes.find(
    (m) => m.diaId === ficha.id && m.feitoEm === treino.hoje,
  );
  const feitaHoje = marcacaoDeHoje !== undefined;
  const situacao = treino.concluido
    ? "Treino concluído"
    : `Semana ${treino.semana.atual} de ${treino.semana.total}`;
  const n = ficha.exercicios.length;

  return (
    <Tela logo={false} barra={ficha.removida ? undefined : "um"}>
      <BackButton onClick={voltar} />
      <header className="flex flex-col gap-8">
        <div>
          {marcacaoDeHoje?.pendente ? (
            <Chip tom="neutral">AGUARDANDO ENVIO</Chip>
          ) : feitaHoje ? (
            <Chip tom="success">✓ Feita hoje</Chip>
          ) : (
            <p className="text-overline text-text-secondary">
              {eDeHoje
                ? treino.marcacoes.some((m) => m.feitoEm === treino.hoje)
                  ? "Próximo treino"
                  : "Ficha de hoje"
                : "Ficha"}
            </p>
          )}
        </div>
        <h1 className="text-title-screen">Ficha {ficha.letra}</h1>
        <p className="text-body text-text-secondary">
          {ficha.nome} · {n === 1 ? "1 exercício" : `${n} exercícios`}
        </p>
        <p className="truncate text-caption text-text-secondary">
          {treino.nome} · {situacao}
        </p>
      </header>

      <ol className="flex flex-col gap-12">
        {ficha.exercicios.map((e, i) => {
          const atual = treino.cargas[e.exercicioId];
          return (
            <li
              key={`${e.exercicioId}-${i}`}
              className="flex flex-col gap-12 rounded-card bg-bg-surface p-20"
            >
              <div className="flex items-start gap-12">
                <span className="text-number-md text-text-secondary">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <p className="line-clamp-2 text-title-sm text-text-primary">{e.nome}</p>
                  <p className="text-body text-text-secondary">
                    {textoDaSerie(e.series, e.reps, e.medida)}
                    {e.descanso > 0 && ` · Descanso ${e.descanso} s`}
                  </p>
                </div>
              </div>
              {e.observacao && (
                <div className="flex flex-col gap-4">
                  <p className="text-overline text-text-secondary">Observação</p>
                  <p className="text-body text-text-primary">{e.observacao}</p>
                </div>
              )}
              {e.modoDeCarga !== "none" && (
                <div className="flex items-end justify-between gap-16">
                  <div className="flex flex-col gap-4">
                    <p className="text-overline text-text-secondary">Carga</p>
                    <p className="flex items-end gap-4">
                      <span className="text-number-md text-text-primary">
                        {atual ? textoDaCarga(atual.kg) : "—"}
                      </span>
                      {atual && <span className="text-caption text-text-secondary">kg</span>}
                    </p>
                    {atual && (
                      <p className="text-caption text-text-secondary">
                        Atualizada em {diaDaEdicao(atual.editadaEm)}
                      </p>
                    )}
                  </div>
                  <TextButton aria-label={`Editar carga de ${e.nome}`} onClick={() => setCarga(e)}>
                    {atual ? "Editar" : "Registrar"}
                  </TextButton>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!ficha.removida && (
        <BarraFixa>
          {feitaHoje ? (
            <Button
              variante="secondary"
              disabled={ocupado}
              onClick={() =>
                void agir(() => desfazerMarcacao(ficha.id, treino.hoje), "Marcação desfeita.")
              }
            >
              Desfazer marcação
            </Button>
          ) : (
            <Button
              disabled={ocupado}
              onClick={() =>
                void agir(
                  () => marcarComoFeito(ficha.id, treino.hoje),
                  "Treino marcado. Bom trabalho!",
                )
              }
            >
              Marcar como feito
            </Button>
          )}
        </BarraFixa>
      )}

      <FolhaCarga
        key={carga?.exercicioId}
        exercicio={carga && { nome: carga.nome, carga: treino.cargas[carga.exercicioId] }}
        offline={offline}
        ocupado={ocupado}
        aoFechar={() => setCarga(null)}
        aoSalvar={(kg) =>
          void agir(() => salvarCarga(carga!.exercicioId, kg), "Carga salva.").then(
            (ok) => ok && setCarga(null),
          )
        }
      />
    </Tela>
  );
}
