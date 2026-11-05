import { useNavigate, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { useState } from "react";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { diaEMes } from "@/features/alunos/listaDeAlunos";
import { ErroApp } from "@/lib/erros";
import {
  ActiveWorkoutCard,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Logo,
  Notice,
  Tela,
  useToast,
} from "@/ui";
import { desfazerMarcacao, marcarComoFeito, type SituacaoDoEnvio } from "./acoes";
import { AVISO_GUARDADO, registrosAguardando } from "./textos";
import type { DadosDoAluno, TreinoDoAluno } from "./dados";
import {
  dataPorExtenso,
  diasDaSemana,
  fichaDeHoje,
  podeMarcar,
  rotuloDaSemana,
  ultimaMarcacao,
} from "./logica";
import { PainelDoDia } from "./PainelDoDia";

const INICIAIS = ["S", "T", "Q", "Q", "S", "S", "D"];

const exercicios = (n: number) => (n === 1 ? "1 exercício" : `${n} exercícios`);

function Semana({
  treino,
  aoEscolher,
}: {
  treino: TreinoDoAluno;
  aoEscolher: (dia: string) => void;
}) {
  const dias = diasDaSemana(treino.hoje);
  return (
    <section aria-label="Semana" className="flex flex-col gap-12 rounded-card bg-bg-surface p-16">
      <p className="text-label text-text-secondary">{rotuloDaSemana(dias)}</p>
      <div className="flex justify-between">
        {dias.map((dia, i) => {
          const letras = treino.marcacoes
            .filter((m) => m.feitoEm === dia)
            .map((m) => treino.fichas.find((f) => f.id === m.diaId)?.letra)
            .join("");
          const ativo = podeMarcar(treino.inicio, dia, treino.hoje);
          return (
            <button
              key={dia}
              type="button"
              disabled={!ativo}
              onClick={() => aoEscolher(dia)}
              aria-label={`${dataPorExtenso(dia)}${letras ? `, ficha ${letras}` : ""}`}
              className={clsx(
                "flex w-40 flex-col items-center gap-4 rounded-control py-8",
                dia === treino.hoje && "bg-bg-surface-raised",
                !ativo && "opacity-50",
              )}
            >
              <span className="text-caption text-text-secondary">{INICIAIS[i]}</span>
              <span className="text-body-strong text-text-primary">{Number(dia.slice(8, 10))}</span>
              <span className="h-16 text-caption text-text-brand-soft">{letras}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Início do aluno (Figma "Aluno · Home", Home · 1, 3, 4 e 5; regras 1, 5, 9, 10 e 14 a 18).
 * O menu inferior só entra quando houver mais de uma aba (fatia 6): por ora, o "Sair" fica no topo.
 */
export function InicioPage({ nome, dados }: { nome: string; dados: DadosDoAluno }) {
  const navegar = useNavigate();
  const router = useRouter();
  const mostrarToast = useToast();
  const [sair, setSair] = useState(false);
  const [dia, setDia] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { treino } = dados;
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome;

  async function agir(acao: () => Promise<SituacaoDoEnvio>, sucesso: string) {
    setOcupado(true);
    try {
      const situacao = await acao();
      await router.invalidate();
      mostrarToast("success", situacao === "guardado" ? AVISO_GUARDADO : sucesso);
    } catch (erro) {
      mostrarToast("error", erro instanceof ErroApp ? erro.message : "Não foi possível salvar.");
    } finally {
      setOcupado(false);
    }
  }

  const hoje = treino ? fichaDeHoje(treino.fichas, treino.marcacoes) : null;
  const anterior = treino ? ultimaMarcacao(treino.marcacoes) : null;
  const ultima = treino?.fichas.find((f) => f.id === anterior?.diaId);
  const abrir = (diaId: string) => void navegar({ to: "/aluno/ficha/$diaId", params: { diaId } });

  return (
    <Tela logo={false}>
      <div className="flex h-[28px] items-center justify-between">
        <Logo />
        <IconButton icone="logout" rotulo="Sair" tamanho="sm" onClick={() => setSair(true)} />
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-caption text-text-secondary">{dataPorExtenso(dados.hoje)}</p>
        <h1 className="text-title-screen">Olá, {primeiroNome}</h1>
      </div>

      {dados.offline ? (
        <Notice tom="neutral" titulo="Sem conexão">
          Mostrando o treino salvo neste aparelho.
          {dados.pendentes ? ` ${registrosAguardando(dados.pendentes)}.` : ""}
        </Notice>
      ) : dados.pendentes ? (
        <Notice tom="neutral" titulo="Aguardando envio">
          {registrosAguardando(dados.pendentes)}. Eles saem assim que a conexão permitir.
        </Notice>
      ) : null}

      {!treino ? (
        <EmptyState icone="fitness_center" titulo="Sem treino por enquanto">
          Você ainda não tem um treino ativo. Peça um novo ao seu professor.
        </EmptyState>
      ) : (
        <>
          <ActiveWorkoutCard
            nome={treino.nome}
            situacao={
              treino.concluido
                ? "Treino concluído"
                : `Semana ${treino.semana.atual} de ${treino.semana.total}`
            }
            progresso={treino.progresso}
            feitos={treino.marcacoes.length}
            inicio={diaEMes(treino.inicio)}
            fim={diaEMes(treino.fim)}
          />
          {treino.concluido && (
            <Notice tom="info" titulo="Treino concluído">
              Você pode continuar treinando com as fichas atuais. Peça um treino novo ao seu
              professor.
            </Notice>
          )}
          <Semana treino={treino} aoEscolher={setDia} />

          {hoje && (
            <section className="flex flex-col gap-12 rounded-card bg-bg-surface p-20">
              <p className="text-overline text-text-secondary">Ficha de hoje</p>
              <div className="flex flex-col gap-4">
                <p className="text-title-md text-text-primary">Ficha {hoje.letra}</p>
                <p className="line-clamp-2 text-body text-text-secondary">{hoje.nome}</p>
              </div>
              <p className="line-clamp-2 text-caption text-text-secondary">
                {hoje.exercicios
                  .slice(0, 3)
                  .map((e) => e.nome)
                  .join(" · ")}
                {hoje.exercicios.length > 3 && ` + ${exercicios(hoje.exercicios.length - 3)}`}
              </p>
              {ultima && (
                <p className="text-caption text-text-secondary">
                  Segue a sequência depois da Ficha {ultima.letra}
                </p>
              )}
              <Button onClick={() => abrir(hoje.id)}>Ver ficha</Button>
            </section>
          )}

          {treino.fichas.filter((f) => !f.removida && f.id !== hoje?.id).length > 0 && (
            <section className="flex flex-col gap-8">
              <p className="text-overline text-text-secondary">Outras fichas</p>
              {treino.fichas
                .filter((f) => !f.removida && f.id !== hoje?.id)
                .map((f) => {
                  const feita = ultimaMarcacao(treino.marcacoes.filter((m) => m.diaId === f.id));
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => abrir(f.id)}
                      className="flex items-center gap-16 rounded-tile bg-bg-surface p-16 text-left"
                    >
                      <span className="flex size-40 shrink-0 items-center justify-center rounded-control bg-bg-surface-raised text-body-strong">
                        {f.letra}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-strong text-text-primary">
                          Ficha {f.letra}
                        </span>
                        <span className="truncate text-caption text-text-secondary">
                          {f.nome} · {exercicios(f.exercicios.length)}
                        </span>
                      </span>
                      {feita && <Chip tom="neutral">{diaEMes(feita.feitoEm)}</Chip>}
                    </button>
                  );
                })}
            </section>
          )}

          <PainelDoDia
            treino={treino}
            dia={dia}
            ocupado={ocupado}
            aoFechar={() => setDia(null)}
            aoMarcar={(diaId, data) =>
              void agir(() => marcarComoFeito(diaId, data), "Treino marcado. Bom trabalho!")
            }
            aoDesfazer={(diaId, data) =>
              void agir(() => desfazerMarcacao(diaId, data), "Marcação desfeita.")
            }
          />
        </>
      )}
      <FolhaSair aberta={sair} aoFechar={() => setSair(false)} />
    </Tela>
  );
}
