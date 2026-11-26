import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  alturaEmTexto,
  nascimentoComIdade,
  pesoEmTexto,
  telefoneParaExibir,
} from "@/features/acompanhar/logica";
import { diaMesAno } from "@/features/acompanhar/logica";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { Button, Tela } from "@/ui";
import { version } from "../../../package.json";
import type { PerfilDaConta } from "./dadosAbas";
import { FolhaExcluirConta } from "./FolhaExcluirConta";
import { MenuDoAluno } from "./MenuDoAluno";

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-8">
      <p className="text-overline text-text-secondary">{titulo}</p>
      <div className="flex flex-col gap-16 rounded-card bg-bg-surface p-20">{children}</div>
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-overline text-text-secondary">{rotulo}</p>
      <p className="text-body break-words text-text-primary">{valor}</p>
    </div>
  );
}

/** Linha de ação do bloco Conta (sem seta, como no Figma). */
function Acao({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] items-center text-left text-body-strong text-text-primary"
    >
      {children}
    </button>
  );
}

/**
 * Perfil do aluno (Figma "Aluno · Abas", seção 4; regras 85, 99, 108, 120 e 121): dados, "Editar
 * dados", professor, conta (e-mail, "Sair" e "Excluir minha conta") e sobre. "Termos de uso" e
 * "Política de privacidade" aparecem sem seta e sem toque até o jurídico definir o texto.
 */
export function PerfilAlunoPage({ dados }: { dados: PerfilDaConta }) {
  const navegar = useNavigate();
  const [sair, setSair] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const { perfil, professor, email } = dados;
  const { aluno } = perfil;
  const vazio = "—";
  return (
    <Tela menu>
      <h1 className="text-title-screen">Perfil</h1>
      <Bloco titulo="Meus dados">
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
        {perfil.atualizadoEm && (
          <p className="text-caption text-text-secondary">
            Atualizado em {diaMesAno(perfil.atualizadoEm)}
          </p>
        )}
        <Button variante="secondary" onClick={() => void navegar({ to: "/aluno/perfil/editar" })}>
          Editar dados
        </Button>
      </Bloco>
      {professor && (
        <Bloco titulo="Meu professor">
          <p className="text-body-strong break-words text-text-primary">{professor}</p>
        </Bloco>
      )}
      <Bloco titulo="Conta">
        <Campo rotulo="E-mail" valor={email} />
        <Acao onClick={() => setSair(true)}>Sair</Acao>
        <Acao onClick={() => setExcluir(true)}>Excluir minha conta</Acao>
      </Bloco>
      <Bloco titulo="Sobre">
        <Campo rotulo="Versão do app" valor={version} />
        <p className="text-body-strong text-text-primary">Termos de uso</p>
        <p className="text-body-strong text-text-primary">Política de privacidade</p>
      </Bloco>
      <FolhaSair aberta={sair} aoFechar={() => setSair(false)} />
      <FolhaExcluirConta aberta={excluir} aoFechar={() => setExcluir(false)} />
      <MenuDoAluno ativa="perfil" />
    </Tela>
  );
}
