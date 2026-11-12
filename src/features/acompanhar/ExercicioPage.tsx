import { useRouter } from "@tanstack/react-router";
import { textoDaCarga } from "@/features/aluno/logica";
import { Tela } from "@/ui";
import { Cabecalho } from "./Cabecalho";
import type { HistoricoDeCargas } from "./dados";
import { diaMesAno } from "./logica";

/**
 * Progressão de carga, detalhe do exercício (Figma "Progressão · 2 Detalhe do exercício"; regra
 * 63): a carga atual e o histórico de cargas, da mais recente para a mais antiga.
 */
export function ExercicioPage({ dados }: { dados: HistoricoDeCargas }) {
  const router = useRouter();
  const { aluno, exercicio, historico } = dados;
  return (
    <Tela logo={false}>
      <Cabecalho
        titulo={exercicio.nome}
        apoio={aluno.nome}
        aoVoltar={() => router.history.back()}
      />
      <section
        aria-label="Carga atual"
        className="flex flex-col gap-4 rounded-card bg-bg-surface p-20"
      >
        <p className="text-overline text-text-secondary">Carga atual</p>
        <p className="flex items-end gap-4">
          <span className="text-number-md text-text-primary">{textoDaCarga(exercicio.kg)}</span>
          <span className="text-caption text-text-secondary">kg</span>
        </p>
        <p className="text-caption text-text-secondary">atualizada em {diaMesAno(exercicio.dia)}</p>
      </section>
      <section aria-label="Histórico de cargas" className="flex flex-col gap-8">
        <p className="text-overline text-text-secondary">Histórico de cargas</p>
        <ul className="flex flex-col gap-8">
          {historico.map((h, i) => (
            <li
              key={`${h.dia}-${i}`}
              className="flex items-center justify-between gap-16 rounded-tile bg-bg-surface p-16"
            >
              <span className="text-body-strong text-text-primary">{textoDaCarga(h.kg)} kg</span>
              <span className="text-caption text-text-secondary">{diaMesAno(h.dia)}</span>
            </li>
          ))}
        </ul>
      </section>
    </Tela>
  );
}
