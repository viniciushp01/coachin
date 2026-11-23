import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { diaEMes } from "@/features/alunos/listaDeAlunos";
import { ErroApp } from "@/lib/erros";
import {
  ActiveWorkoutCard,
  Chip,
  EmptyState,
  FichaTile,
  IconButton,
  Logo,
  Notice,
  Tela,
  TodayCard,
  TodayCardFeito,
  useToast,
  WeekDay,
} from "@/ui";
import { AvisoDeTreinoNovo } from "./AvisoDeTreinoNovo";
import { desfazerMarcacao, marcarComoFeito, type SituacaoDoEnvio } from "./acoes";
import { AVISO_GUARDADO, registrosAguardando } from "./textos";
import type { DadosDoAluno, TreinoDoAluno } from "./dados";
import {
  dataPorExtenso,
  diasDaSemana,
  feitaHoje,
  fichaDeHoje,
  podeAvancarSemana,
  podeMarcar,
  podeVoltarSemana,
  rotuloDaSemana,
  somarSemanas,
  ultimaMarcacao,
} from "./logica";
import { PainelDoDia } from "./PainelDoDia";
import { useVirarDia } from "./useVirarDia";

const INICIAIS = ["S", "T", "Q", "Q", "S", "S", "D"];

const exercicios = (n: number) => (n === 1 ? "1 exercício" : `${n} exercícios`);

function Semana({
  treino,
  aoEscolher,
}: {
  treino: TreinoDoAluno;
  aoEscolher: (dia: string) => void;
}) {
  // Qualquer data da semana mostrada. Sem navegação do aluno, acompanha o "hoje" no fuso dele,
  // inclusive na virada do dia (regras 115, 163 item 5 e 171).
  const [escolhida, setSemana] = useState<string | null>(null);
  const semana = escolhida ?? treino.hoje;
  const dias = diasDaSemana(semana);
  return (
    <section aria-label="Semana" className="flex flex-col gap-12 rounded-card bg-bg-surface p-16">
      <div className="flex items-center justify-between">
        <p className="text-label text-text-secondary">{rotuloDaSemana(dias)}</p>
        <div className="flex gap-4">
          <IconButton
            icone="chevron_left"
            rotulo="Semana anterior"
            tamanho="sm"
            disabled={!podeVoltarSemana(semana, treino.inicio)}
            onClick={() => setSemana(somarSemanas(semana, -1))}
          />
          <IconButton
            icone="chevron_right"
            rotulo="Próxima semana"
            tamanho="sm"
            disabled={!podeAvancarSemana(semana, treino.hoje, treino.fim)}
            onClick={() => setSemana(somarSemanas(semana, 1))}
          />
        </div>
      </div>
      <div className="flex">
        {dias.map((dia, i) => (
          <WeekDay
            key={dia}
            estado={dia === treino.hoje ? "hoje" : dia > treino.hoje ? "futuro" : "padrao"}
            inicial={INICIAIS[i]!}
            numero={Number(dia.slice(8, 10))}
            marcas={treino.marcacoes
              .filter((m) => m.feitoEm === dia)
              .map((m) => treino.fichas.find((f) => f.id === m.diaId)?.letra)
              .join("")}
            rotulo={dataPorExtenso(dia)}
            desativado={!podeMarcar(treino.inicio, dia, treino.hoje)}
            aoEscolher={() => aoEscolher(dia)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Início do aluno (Figma "Aluno · Home", Home · 1, 3, 4 e 5; regras 1, 5, 9, 10, 14 a 18, 163 e 171).
 * O aluno não pede treino novo pelo app: fala com o professor (regra 169).
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
  useVirarDia(dados.hoje, dados.fuso);
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
  const feita = treino ? feitaHoje(treino.marcacoes, treino.hoje) : null;
  const feitaFicha = treino?.fichas.find((f) => f.id === feita?.diaId);
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
              Você pode continuar treinando com as fichas atuais. Para um treino novo, fale com o
              seu professor.
            </Notice>
          )}
          <Semana treino={treino} aoEscolher={setDia} />

          {feita ? (
            <TodayCardFeito
              letra={feitaFicha?.letra ?? ""}
              nome={feitaFicha?.nome}
              pendente={feita.pendente}
            />
          ) : (
            hoje && (
              <TodayCard
                letra={hoje.letra}
                nome={hoje.nome}
                previa={
                  <>
                    {hoje.exercicios
                      .slice(0, 3)
                      .map((e) => e.nome)
                      .join(" · ")}
                    {hoje.exercicios.length > 3 && ` + ${exercicios(hoje.exercicios.length - 3)}`}
                  </>
                }
                sequencia={ultima ? `Segue a sequência depois da Ficha ${ultima.letra}` : undefined}
                aoAbrir={() => abrir(hoje.id)}
              />
            )
          )}

          {feita && hoje && (
            <section aria-label="Próximo treino" className="flex flex-col gap-8">
              <p className="text-overline text-text-secondary">Próximo treino</p>
              <FichaTile
                letra={hoje.letra}
                detalhe={`${hoje.nome} · ${exercicios(hoje.exercicios.length)}`}
                rotulo={`Próximo treino: Ficha ${hoje.letra}, ${hoje.nome}`}
                seta
                aoAbrir={() => abrir(hoje.id)}
              />
            </section>
          )}

          {treino.fichas.filter((f) => !f.removida && f.id !== hoje?.id).length > 0 && (
            <section aria-label="Outras fichas" className="flex flex-col gap-8">
              <p className="text-overline text-text-secondary">Outras fichas</p>
              {treino.fichas
                .filter((f) => !f.removida && f.id !== hoje?.id)
                .map((f) => {
                  const ultimaDela = ultimaMarcacao(
                    treino.marcacoes.filter((m) => m.diaId === f.id),
                  );
                  return (
                    <FichaTile
                      key={f.id}
                      letra={f.letra}
                      detalhe={`${f.nome} · ${exercicios(f.exercicios.length)}`}
                      aoAbrir={() => abrir(f.id)}
                      fim={ultimaDela && <Chip tom="neutral">{diaEMes(ultimaDela.feitoEm)}</Chip>}
                    />
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
      <AvisoDeTreinoNovo offline={dados.offline} />
    </Tela>
  );
}
