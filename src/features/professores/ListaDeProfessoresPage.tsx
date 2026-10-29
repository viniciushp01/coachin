import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { BarraFixa, Button, EmptyState, IconButton, SearchField, StudentRow, Tela } from "@/ui";
import {
  buscarPorNome,
  CHIP_DO_PROFESSOR,
  resumoDaLista,
  type EstadoDoProfessor,
  type LinhaDeProfessor,
} from "./listaDeProfessores";

/** Só o convite abre tela nesta fatia; a tela do professor ativo ou bloqueado é da fatia 9. */
const COM_TELA_DO_CONVITE = new Set<EstadoDoProfessor>(["pendente", "expirado", "recusado"]);

/**
 * Lista de professores, a tela raiz do administrador (regras 92, 102 e 114; Figma "Admin ·
 * Professores", seção 1): resumo, busca por nome, uma linha por professor com o chip do estado
 * e "Convidar professor" fixo no rodapé. As linhas com convite abrem a tela do convite (#45).
 */
export function ListaDeProfessoresPage({ linhas }: { linhas: LinhaDeProfessor[] }) {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const [sair, setSair] = useState(false);
  const encontrados = buscarPorNome(linhas, busca);

  return (
    <Tela barra="um">
      <div className="flex items-start justify-between gap-16">
        <div className="flex min-w-0 flex-col gap-8">
          <h1 className="text-title-screen">Professores</h1>
          {linhas.length > 0 && (
            <p className="text-body text-text-secondary">{resumoDaLista(linhas, busca)}</p>
          )}
        </div>
        {/* Regra 145: o administrador não tem Perfil; sai por aqui, sem o aviso da fila local. */}
        <IconButton icone="logout" rotulo="Sair" onClick={() => setSair(true)} />
      </div>
      {linhas.length === 0 ? (
        <EmptyState
          icone="person"
          titulo="Nenhum professor ainda"
          className="flex-1 justify-center"
        >
          Convide o primeiro professor e envie o link para ativar o acesso.
        </EmptyState>
      ) : (
        <>
          <SearchField
            rotulo="Buscar professor"
            placeholder="Buscar professor"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {encontrados.length === 0 ? (
            <EmptyState
              icone="search"
              titulo="Nenhum professor encontrado"
              className="flex-1 justify-center"
            >
              Confira o nome ou busque só por parte dele.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-8">
              {encontrados.map((l) => (
                <li key={l.id}>
                  <StudentRow
                    nome={l.nome}
                    status={CHIP_DO_PROFESSOR[l.estado]}
                    detalhe={l.detalhe}
                    onClick={
                      COM_TELA_DO_CONVITE.has(l.estado)
                        ? () =>
                            void navegar({
                              to: "/admin/convite/$conviteId",
                              params: { conviteId: l.id },
                            })
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <BarraFixa>
        <Button onClick={() => void navegar({ to: "/admin/convidar-professor" })}>
          Convidar professor
        </Button>
      </BarraFixa>
      <FolhaSair aberta={sair} aoFechar={() => setSair(false)} comFilaLocal={false} />
    </Tela>
  );
}
