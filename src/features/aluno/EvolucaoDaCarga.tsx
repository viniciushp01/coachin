import clsx from "clsx";
import { useState } from "react";
import { diaEMes } from "@/features/alunos/listaDeAlunos";
import {
  GRAFICO,
  corDoTom,
  PERIODOS,
  PERIODO_PADRAO,
  montarGrafico,
  mostrarFiltro,
  registrosDoPeriodo,
  resumoDoPeriodo,
  textoDoPeriodoVazio,
  type Periodo,
  type Registro,
  type Tom,
} from "./evolucao";
import { textoDaCarga } from "./logica";

const COR = {
  texto: "var(--color-text-secondary)",
  valor: "var(--color-text-primary)",
  marca: "var(--color-text-brand)",
  sucesso: "var(--color-status-success)",
  grade: "var(--color-border-subtle)",
  fundo: "var(--color-bg-surface)",
};

const kg = (v: number) => `${textoDaCarga(v)} kg`;

function Grafico({
  registros,
  resumo,
}: {
  registros: Registro[];
  resumo: { texto: string; tom: Tom } | null;
}) {
  const g = montarGrafico(registros);
  const { area } = g;
  const meio = (area.topo + area.base) / 2;
  const iguais = g.minimo === g.maximo;
  const destaque = g.pontos.at(-1)!;
  const texto = { fontSize: 12, fill: COR.texto } as const;
  return (
    <svg
      viewBox={`0 0 ${GRAFICO.largura} ${GRAFICO.altura}`}
      role="img"
      aria-label={`Evolução da carga: de ${kg(registros[0]!.kg)} em ${diaEMes(registros[0]!.dia)} para ${kg(destaque.kg)} em ${diaEMes(destaque.dia)}`}
      className="h-auto w-full"
    >
      {(iguais ? [meio] : [area.topo, area.base]).map((y) => (
        <line key={y} x1={60} x2={322} y1={y} y2={y} stroke={COR.grade} strokeDasharray="2 4" />
      ))}
      {iguais ? (
        <text x={16} y={meio + 4} style={texto}>
          {kg(g.maximo)}
        </text>
      ) : (
        <>
          <text x={16} y={area.topo + 4} style={texto}>
            {kg(g.maximo)}
          </text>
          <text x={16} y={area.base + 4} style={texto}>
            {kg(g.minimo)}
          </text>
        </>
      )}
      {resumo && (
        <text x={16} y={26} style={{ fontSize: 12, fill: corDoTom(resumo.tom) }}>
          {resumo.texto}
        </text>
      )}
      <polyline
        points={g.pontos.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={COR.marca}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {g.pontos.map((p, i) =>
        p.destaque ? (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={14} fill={COR.marca} opacity={0.25} />
            <circle cx={p.x} cy={p.y} r={7} fill={COR.marca} />
          </g>
        ) : (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={g.raio}
            fill={COR.fundo}
            stroke={COR.marca}
            strokeWidth={1.5}
          />
        ),
      )}
      <text
        x={destaque.x}
        y={Math.max(destaque.y - 20, 22)}
        textAnchor="middle"
        style={{ fontSize: 12, fill: COR.valor, fontWeight: 600 }}
      >
        {kg(destaque.kg)}
      </text>
      {g.rotulosX.map((r) => (
        <text key={r.dia} x={r.x} y={174} textAnchor="middle" style={texto}>
          {diaEMes(r.dia)}
        </text>
      ))}
    </svg>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card bg-bg-surface p-16">{children}</div>;
}

/**
 * Bloco EVOLUÇÃO do detalhe do exercício (regra 175; Figma "Aluno · Abas", seção 2b): gráfico da
 * carga com pontos nas datas reais e filtro de período. `registros` em ordem cronológica. O
 * filtro muda só o gráfico e o resumo; quem usa mantém o histórico de cargas completo.
 */
export function EvolucaoDaCarga({ registros, hoje }: { registros: Registro[]; hoje: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_PADRAO);
  const comFiltro = mostrarFiltro(registros);
  const visiveis = comFiltro ? registrosDoPeriodo(registros, periodo, hoje) : registros;
  const resumo = comFiltro ? resumoDoPeriodo(visiveis, periodo) : null;

  let conteudo: React.ReactNode;
  if (registros.length === 1) {
    conteudo = (
      <Cartao>
        <Grafico registros={registros} resumo={null} />
        <p className="text-body-strong text-text-primary">Primeira carga registrada</p>
        <p className="text-caption text-text-secondary">
          Quando você registrar outra carga neste exercício, a evolução aparece aqui.
        </p>
      </Cartao>
    );
  } else if (visiveis.length === 0 && periodo !== "tudo") {
    conteudo = (
      <Cartao>
        <p className="text-body-strong text-text-primary">
          Nenhuma carga {textoDoPeriodoVazio(periodo)}
        </p>
        <p className="text-caption text-text-secondary">
          Escolha um período maior para ver a evolução deste exercício.
        </p>
      </Cartao>
    );
  } else if (visiveis.length === 1 && comFiltro && periodo !== "tudo") {
    conteudo = (
      <Cartao>
        <Grafico registros={visiveis} resumo={null} />
        <p className="text-caption text-text-secondary">
          Só uma carga {textoDoPeriodoVazio(periodo)}. Escolha um período maior para comparar com as
          cargas anteriores.
        </p>
      </Cartao>
    );
  } else {
    conteudo = (
      <Cartao>
        <Grafico registros={visiveis} resumo={resumo} />
      </Cartao>
    );
  }

  return (
    <section aria-label="Evolução" className="flex flex-col gap-12">
      <p className="text-overline text-text-secondary">Evolução</p>
      {comFiltro && (
        <div role="group" aria-label="Período" className="flex flex-wrap gap-8">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={periodo === p.id}
              onClick={() => setPeriodo(p.id)}
              className={clsx(
                "h-[34px] rounded-pill border px-16 text-label",
                periodo === p.id
                  ? "border-text-brand bg-bg-brand-subtle text-text-brand-soft"
                  : "border-border-subtle bg-bg-surface text-text-secondary",
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      )}
      {conteudo}
    </section>
  );
}
