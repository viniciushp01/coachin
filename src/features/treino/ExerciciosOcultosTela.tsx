import { BackButton, SectionRow, Tela } from "@/ui";
import type { ExercicioOculto } from "./ocultos";

type ExerciciosOcultosTelaProps = {
  ocultos: ExercicioOculto[];
  gravando: boolean;
  aoVoltar: () => void;
  aoDesfazer: (id: string) => void;
};

/** Tela "Exercícios ocultos": desfazer mostra de novo na busca (regra 74; Biblioteca · 4). */
export function ExerciciosOcultosTela({
  ocultos,
  gravando,
  aoVoltar,
  aoDesfazer,
}: ExerciciosOcultosTelaProps) {
  return (
    <Tela>
      <BackButton onClick={aoVoltar} />
      <div className="flex flex-col gap-8">
        <h1 className="text-title-screen">Exercícios ocultos</h1>
        <p className="text-body text-text-secondary">
          Não aparecem na sua busca. Nada foi excluído. Toque em desfazer para mostrar de novo.
        </p>
      </div>
      <ul className="flex flex-col gap-8">
        {ocultos.map((exercicio) => (
          <li key={exercicio.id}>
            <SectionRow
              icone="fitness_center"
              iconeDireita="undo"
              titulo={exercicio.nome}
              detalhe={exercicio.detalhe}
              aria-label={`Desfazer: ${exercicio.nome}`}
              disabled={gravando}
              onClick={() => aoDesfazer(exercicio.id)}
            />
          </li>
        ))}
      </ul>
    </Tela>
  );
}
