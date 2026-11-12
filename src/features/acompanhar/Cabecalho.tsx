import { BackButton } from "@/ui";

/** Topo das telas de acompanhamento: voltar, título e "Nome do aluno" (Figma, seções 2 a 4). */
export function Cabecalho({
  titulo,
  apoio,
  aoVoltar,
}: {
  titulo: string;
  /** Linha abaixo do título: o nome do aluno, com "só leitura" onde o Figma traz. */
  apoio: string;
  aoVoltar: () => void;
}) {
  return (
    <>
      <BackButton onClick={aoVoltar} />
      <header className="flex flex-col gap-4">
        <h1 className="text-title-screen break-words">{titulo}</h1>
        <p className="text-body text-text-secondary">{apoio}</p>
      </header>
    </>
  );
}
