import { useNavigate } from "@tanstack/react-router";
import { diaEMes } from "@/features/alunos/listaDeAlunos";
import { Notice, Tela } from "@/ui";
import { Cabecalho } from "./Cabecalho";
import type { PerfilDoAluno } from "./dados";
import {
  alturaEmTexto,
  linkDoWhatsApp,
  nascimentoComIdade,
  pesoEmTexto,
  telefoneParaExibir,
} from "./logica";

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-overline text-text-secondary">{rotulo}</p>
      <p className="text-body break-words text-text-primary">{valor}</p>
    </div>
  );
}

/**
 * Perfil do aluno, só leitura (Figma "Perfil · Só leitura"; regras 41, 71 e 108): nome, nascimento
 * com a idade, telefone com o link "Abrir WhatsApp", altura, peso e restrições ou dores.
 */
export function PerfilPage({ perfil }: { perfil: PerfilDoAluno }) {
  const navegar = useNavigate();
  const { aluno } = perfil;
  const vazio = "—";
  return (
    <Tela logo={false}>
      <Cabecalho
        titulo="Perfil"
        apoio={
          perfil.atualizadoEm
            ? `${aluno.nome} · atualizado em ${diaEMes(perfil.atualizadoEm)}`
            : `${aluno.nome} · ainda sem dados`
        }
        aoVoltar={() =>
          void navegar({ to: "/professor/alunos/$alunoId", params: { alunoId: aluno.id } })
        }
      />
      <section aria-label="Dados" className="flex flex-col gap-16 rounded-card bg-bg-surface p-20">
        <Campo rotulo="Nome" valor={aluno.nome} />
        <Campo
          rotulo="Nascimento"
          valor={perfil.nascimento ? nascimentoComIdade(perfil.nascimento, aluno.hoje) : vazio}
        />
        <Campo
          rotulo="Telefone (WhatsApp)"
          valor={perfil.telefone ? telefoneParaExibir(perfil.telefone) : vazio}
        />
        <Campo
          rotulo="Altura"
          valor={perfil.altura !== null ? alturaEmTexto(perfil.altura) : vazio}
        />
        <Campo rotulo="Peso" valor={perfil.peso !== null ? pesoEmTexto(perfil.peso) : vazio} />
        <Campo rotulo="Restrições ou dores" valor={perfil.restricoes ?? vazio} />
      </section>
      {perfil.telefone && (
        <a
          href={linkDoWhatsApp(perfil.telefone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-48 items-center self-start py-12 text-link"
        >
          Abrir WhatsApp
        </a>
      )}
      <Notice tom="neutral" titulo="Só leitura">
        O aluno edita os dados no app. Você vê sempre o valor mais recente.
      </Notice>
    </Tela>
  );
}
