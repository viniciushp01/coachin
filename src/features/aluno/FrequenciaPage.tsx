import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  estadoDoDia,
  limitesDoCalendario,
  marcasDoDia,
  podeAvancarMes,
  podeVoltarMes,
  textoDoMes,
  type FichaMarcada,
  type MarcacaoDoDia,
} from "@/features/acompanhar/logica";
import { ErroApp } from "@/lib/erros";
import { IconButton, MonthDay, Tela, useToast } from "@/ui";
import {
  casasAntesDoDia1,
  dataIso,
  diasNoMes,
  mesDe,
  nomeDoMes,
  somarMeses,
  type Mes,
} from "@/ui/datas";
import { desfazerMarcacao, marcarComoFeito, type SituacaoDoEnvio } from "./acoes";
import type { DadosDaFrequencia } from "./dadosAbas";
import { treinoDoPainel } from "./frequencia";
import { dataPorExtenso } from "./logica";
import { MenuDoAluno } from "./MenuDoAluno";
import { PainelDoDia } from "./PainelDoDia";
import { AVISO_GUARDADO } from "./textos";

const INICIAIS = ["S", "T", "Q", "Q", "S", "S", "D"];

/**
 * Frequência do aluno (Figma "Aluno · Abas", seção 1; regras 9, 45 e 163): o mês com os treinos
 * feitos e, ao tocar num dia, o painel do dia editável (marcar e desfazer, regras 20 a 24). Meses,
 * mês sem treino e dia futuro seguem o calendário do professor (regras 61 e 72). Sem conexão, vale
 * o treino guardado no aparelho (regra 116).
 */
export function FrequenciaPage({ dados }: { dados: DadosDaFrequencia }) {
  const router = useRouter();
  const mostrarToast = useToast();
  const { inicio, calendario } = dados;
  const hoje = inicio.hoje;
  const ativo = inicio.treino;

  const fichas: FichaMarcada[] = calendario
    ? calendario.fichas
    : (ativo?.fichas.map((f) => ({
        id: f.id,
        treinoId: ativo.id,
        letra: f.letra,
        nome: f.nome,
        removida: f.removida,
        exercicios: f.exercicios.length,
      })) ?? []);
  const marcacoesDoCalendario: MarcacaoDoDia[] = calendario?.marcacoes ?? [];
  const painel = treinoDoPainel(ativo, hoje, fichas, marcacoesDoCalendario);
  // As marcações do treino ativo vêm da cópia, com a fila local aplicada; as dos anteriores, do
  // calendário.
  const marcacoes: MarcacaoDoDia[] = painel.marcacoes.map((m) => ({
    diaId: m.diaId,
    feitoEm: m.feitoEm,
  }));
  const treinos = calendario?.treinos ?? (ativo ? [{ inicio: ativo.inicio, fim: ativo.fim }] : []);
  const { primeiro, ultimo } = limitesDoCalendario(treinos, marcacoes, hoje);

  const [mes, setMes] = useState<Mes>(() => mesDe(hoje));
  const [dia, setDia] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const nome = nomeDoMes(mes);

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

  return (
    <Tela menu>
      <h1 className="text-title-screen">Frequência</h1>
      <section aria-label="Mês" className="flex flex-col gap-16 rounded-card bg-bg-surface p-16">
        <div className="flex h-[36px] items-start justify-between pl-8">
          <p className="text-body-strong text-text-primary">{nome}</p>
          <div className="flex gap-4">
            <IconButton
              icone="chevron_left"
              rotulo="Mês anterior"
              tamanho="sm"
              disabled={!podeVoltarMes(mes, primeiro)}
              onClick={() => setMes(somarMeses(mes, -1))}
            />
            <IconButton
              icone="chevron_right"
              rotulo="Próximo mês"
              tamanho="sm"
              disabled={!podeAvancarMes(mes, ultimo)}
              onClick={() => setMes(somarMeses(mes, 1))}
            />
          </div>
        </div>
        <div aria-hidden="true" className="grid grid-cols-7">
          {INICIAIS.map((inicial, i) => (
            <span key={i} className="text-center text-label text-text-secondary">
              {inicial}
            </span>
          ))}
        </div>
        <div role="group" aria-label={`Dias de ${nome}`} className="grid grid-cols-7 gap-y-4">
          {Array.from({ length: casasAntesDoDia1(mes) }, (_, i) => (
            <span key={i} data-vazio />
          ))}
          {Array.from({ length: diasNoMes(mes) }, (_, i) => {
            const data = dataIso(mes, i + 1);
            return (
              <MonthDay
                key={data}
                estado={estadoDoDia(data, hoje)}
                numero={i + 1}
                marcas={marcasDoDia(marcacoes, fichas, data)}
                rotulo={dataPorExtenso(data)}
                selecionado={data === dia}
                aoEscolher={() => setDia(data)}
              />
            );
          })}
        </div>
        <p className="text-label text-text-secondary">{textoDoMes(marcacoes, mes)}</p>
      </section>
      <p className="text-caption text-text-secondary">
        Toque em um dia para ver ou marcar o treino.
      </p>
      <PainelDoDia
        treino={painel}
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
      <MenuDoAluno ativa="frequencia" />
    </Tela>
  );
}
