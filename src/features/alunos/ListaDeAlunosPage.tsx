import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { buscarPorNome } from "@/lib/listas";
import {
  BarraFixa,
  Button,
  EmptyState,
  IconButton,
  Logo,
  SearchField,
  StudentRow,
  Tela,
} from "@/ui";
import { CHIP_DO_ALUNO, resumoDaLista, type LinhaDoAluno } from "./listaDeAlunos";

/**
 * Lista de alunos, a tela raiz do professor (regras 54, 55, 59, 102, 114 e 147; Figma "Professor
 * · Alunos", seção 1): resumo, busca por nome, uma linha por aluno com o chip do status e
 * "Cadastrar aluno" fixo no rodapé. Toda
 * linha abre a tela do aluno; a rota escolhe entre a do convite e a do aluno vinculado.
 */
export function ListaDeAlunosPage({ linhas }: { linhas: LinhaDoAluno[] }) {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const [sair, setSair] = useState(false);
  const encontrados = buscarPorNome(linhas, busca);

  return (
    <Tela barra="um" logo={false}>
      {/* Barra de 28 (a altura do símbolo), como no Figma: o botão de 32 a ultrapassa. */}
      <div className="flex h-[28px] items-center justify-between">
        <Logo />
        {/* Regra 147 (3): sai por aqui, sem o aviso da fila local (como o administrador). */}
        <IconButton icone="logout" rotulo="Sair" tamanho="sm" onClick={() => setSair(true)} />
      </div>
      <div className="flex flex-col gap-16">
        <h1 className="text-title-screen">Alunos</h1>
        {linhas.length > 0 && (
          <p className="text-body text-text-secondary">{resumoDaLista(linhas, busca)}</p>
        )}
      </div>
      {linhas.length === 0 ? (
        <EmptyState
          icone="person"
          titulo="Você ainda não tem alunos"
          className="flex-1 justify-center"
        >
          Cadastre o primeiro aluno e envie o convite para o aluno criar o acesso.
        </EmptyState>
      ) : (
        <>
          <SearchField
            rotulo="Buscar aluno"
            placeholder="Buscar aluno"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {encontrados.length === 0 ? (
            <EmptyState
              icone="search"
              titulo="Nenhum aluno encontrado"
              className="flex-1 justify-center"
            >
              Confira o nome ou busque só por parte do nome.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-8">
              {encontrados.map((l) => (
                <li key={l.id}>
                  <StudentRow
                    nome={l.nome}
                    status={CHIP_DO_ALUNO[l.status]}
                    detalhe={l.detalhe}
                    onClick={() =>
                      void navegar({
                        to: "/professor/alunos/$alunoId",
                        params: { alunoId: l.id },
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <BarraFixa>
        <Button onClick={() => void navegar({ to: "/professor/cadastrar-aluno" })}>
          Cadastrar aluno
        </Button>
      </BarraFixa>
      <FolhaSair aberta={sair} aoFechar={() => setSair(false)} comFilaLocal={false} />
    </Tela>
  );
}
