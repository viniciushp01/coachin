import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { diaMesAno } from "@/features/acompanhar/logica";
import { BackButton, Tela } from "@/ui";
import type { EvolucaoDoExercicio } from "./dadosAbas";
import { EvolucaoDaCarga } from "./EvolucaoDaCarga";
import { corDoTom, seloDeVariacao } from "./evolucao";
import { textoDaCarga } from "./logica";

/** Quantas linhas do histórico de cargas aparecem antes de "Ver todos" (Figma 2b · 10). */
const LINHAS = 5;

/**
 * Progressão, detalhe do exercício (Figma "Progressão · 2" e seção 2b; regras 44, 63 e 175): o
 * cartão de carga atual com o selo de variação, o bloco EVOLUÇÃO (gráfico e filtro de período) e
 * o histórico de cargas completo, que o filtro não altera.
 */
export function ExercicioAlunoPage({ dados }: { dados: EvolucaoDoExercicio }) {
  const router = useRouter();
  const [todos, setTodos] = useState(false);
  const { registros, hoje, nome } = dados;
  const atual = registros.at(-1)!;
  const selo = seloDeVariacao(registros);
  const recentes = [...registros].reverse();
  const linhas = todos ? recentes : recentes.slice(0, LINHAS);
  return (
    <Tela logo={false}>
      <BackButton onClick={() => router.history.back()} />
      <h1 className="text-title-screen break-words">{nome}</h1>
      <section
        aria-label="Carga atual"
        className="flex flex-col gap-4 rounded-card bg-bg-surface p-20"
      >
        <p className="text-overline text-text-secondary">Carga atual</p>
        <div className="flex items-end justify-between gap-8">
          <p className="flex items-end gap-4">
            <span className="text-number-md text-text-primary">{textoDaCarga(atual.kg)}</span>
            <span className="text-caption text-text-secondary">kg</span>
          </p>
          {selo && (
            <span
              className="px-10 mb-4 inline-flex h-24 items-center rounded-pill bg-bg-surface-raised text-label"
              style={{ color: corDoTom(selo.tom) }}
            >
              {selo.texto}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-8">
          <p className="text-caption text-text-secondary">atualizada em {diaMesAno(atual.dia)}</p>
          {selo && <p className="text-caption text-text-secondary">{selo.referencia}</p>}
        </div>
      </section>
      <EvolucaoDaCarga registros={registros} hoje={hoje} />
      <section aria-label="Histórico de cargas" className="flex flex-col gap-8">
        <p className="text-overline text-text-secondary">Histórico de cargas</p>
        <ul className="flex flex-col rounded-card bg-bg-surface px-16">
          {linhas.map((r, i) => (
            <li
              key={`${r.dia}-${i}`}
              className="flex items-center justify-between gap-16 border-b border-border-subtle py-16 last:border-b-0"
            >
              <span className="text-body-strong text-text-primary">{textoDaCarga(r.kg)} kg</span>
              <span className="text-caption text-text-secondary">{diaMesAno(r.dia)}</span>
            </li>
          ))}
          {!todos && recentes.length > LINHAS && (
            <li className="py-16">
              <button type="button" onClick={() => setTodos(true)} className="text-link">
                Ver todos os {recentes.length} registros
              </button>
            </li>
          )}
        </ul>
      </section>
    </Tela>
  );
}
