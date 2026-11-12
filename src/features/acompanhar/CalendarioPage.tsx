import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { dataPorExtenso } from "@/features/aluno/logica";
import { IconButton, MonthDay, Notice, Tela } from "@/ui";
import {
  casasAntesDoDia1,
  dataIso,
  diasNoMes,
  mesDe,
  nomeDoMes,
  somarMeses,
  type Mes,
} from "@/ui/datas";
import { Cabecalho } from "./Cabecalho";
import type { DadosDoCalendario } from "./dados";
import {
  avisoDeTreinoConcluido,
  estadoDoDia,
  limitesDoCalendario,
  marcasDoDia,
  podeAvancarMes,
  podeVoltarMes,
  textoDoMes,
} from "./logica";
import { PainelDoDiaSoLeitura } from "./PainelDoDiaSoLeitura";

const INICIAIS = ["S", "T", "Q", "Q", "S", "S", "D"];

/**
 * Calendário do aluno, na visão do professor (Figma "Professor · Acompanhar", seção 2; regras 43,
 * 61, 69 e 72). Só leitura: tocar num dia abre o painel, que não marca nem desfaz.
 */
export function CalendarioPage({ dados }: { dados: DadosDoCalendario }) {
  const navegar = useNavigate();
  const { aluno, fichas, marcacoes, treinos, fimDoAtivo } = dados;
  const [mes, setMes] = useState<Mes>(() => mesDe(aluno.hoje));
  const [dia, setDia] = useState<string | null>(null);
  const { primeiro, ultimo } = limitesDoCalendario(treinos, marcacoes, aluno.hoje);
  const aviso = avisoDeTreinoConcluido(fimDoAtivo, aluno.hoje);
  const nome = nomeDoMes(mes);

  return (
    <Tela logo={false}>
      <Cabecalho
        titulo="Calendário"
        apoio={`${aluno.nome} · só leitura`}
        aoVoltar={() =>
          void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: aluno.id } })
        }
      />
      {aviso && (
        <Notice tom="info" titulo={aviso}>
          As marcações depois dessa data aparecem normalmente.
        </Notice>
      )}
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
                estado={estadoDoDia(data, aluno.hoje)}
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
      <p className="text-caption text-text-secondary">Toque em um dia para ver a marcação.</p>
      <PainelDoDiaSoLeitura
        dia={dia}
        marcacoes={marcacoes}
        fichas={fichas}
        aoFechar={() => setDia(null)}
        aoAbrirFicha={(diaId, feitoEm) => {
          setDia(null);
          void navegar({
            to: "/professor/alunos/$alunoId/ficha/$diaId",
            params: { alunoId: aluno.id, diaId },
            search: { em: feitoEm },
          });
        }}
      />
    </Tela>
  );
}
