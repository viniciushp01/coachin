import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AreaProvisoria } from "@/features/acesso/AreaProvisoria";
import { BarraFixa, Button, EmptyState, Tela, TextButton, type NomeIcone } from "@/ui";
import { apagarConviteGuardado, guardarConvite } from "./conviteGuardado";
import type { TelaDoConvite } from "./telaDoConvite";

type ConvitePageProps = { tela: TelaDoConvite; token: string };

/**
 * Link do convite (regras 46, 48, 79 e 82; Figma "Aluno · Entrada", seções 1, 2 e 8). Sem
 * navegação inferior. Ao sair para criar a conta ou entrar, o convite fica guardado no aparelho
 * para o app voltar a ele depois do login; convite que não vale mais apaga o que estava guardado.
 */
export function ConvitePage({ tela, token }: ConvitePageProps) {
  const navegar = useNavigate();

  // Quem chega logado já está no convite (ou num que não vale mais): o guardado cumpriu o papel.
  const consome = tela.tela !== "valido" && tela.tela !== "ja_tem_conta";
  useEffect(() => {
    if (consome) apagarConviteGuardado();
  }, [consome]);

  function seguir(destino: "/criar-conta" | "/entrar", email: string | null) {
    guardarConvite(token);
    void navegar({ to: destino, search: email ? { email } : {} });
  }

  switch (tela.tela) {
    case "valido":
      return (
        <ConviteComProfessor
          titulo="Você foi convidado para treinar"
          texto={`O professor ${tela.professor} convidou você para o Coach In. Crie o seu acesso para ver os seus treinos e acompanhar a sua frequência.`}
          professor={tela.professor}
          botao="Criar meu acesso"
          aoTocar={() => seguir("/criar-conta", tela.email)}
        >
          <TextButton tom="muted" className="w-full" onClick={() => seguir("/entrar", null)}>
            Já tenho acesso? Entrar
          </TextButton>
        </ConviteComProfessor>
      );
    case "ja_tem_conta":
      return (
        <ConviteComProfessor
          titulo="Você já tem uma conta"
          texto={`O professor ${tela.professor} quer acompanhar seu treino. Entre com a sua conta para vincular.`}
          professor={tela.professor}
          botao="Entrar com minha conta"
          aoTocar={() => seguir("/entrar", tela.email)}
        />
      );
    case "expirado":
      return (
        <ConviteSemValor icone="schedule" titulo="Este convite expirou">
          Os convites valem por 7 dias. Peça um novo convite ao professor {tela.professor}.
        </ConviteSemValor>
      );
    case "usado":
      return (
        <ConviteSemValor
          icone="check_circle"
          titulo="Este convite já foi usado"
          botao={{ texto: "Ir para o login", aoTocar: () => navegar({ to: "/entrar" }) }}
        >
          Cada convite vale para um único acesso. Entre com o e-mail e a senha que você criou.
        </ConviteSemValor>
      );
    case "nao_vale_mais":
      return (
        <ConviteSemValor icone="swap_horiz" titulo="Este link não vale mais">
          Ele foi substituído por um link mais novo. Confira o canal em que você fala com seu
          professor (WhatsApp, e-mail…) e use o link mais recente.
        </ConviteSemValor>
      );
    // Provisório: "Vincular ao professor?" (#47) e a entrada do professor (#49) vêm a seguir.
    case "vincular":
      return <AreaProvisoria nome={`convite de ${tela.professor}`} area="convidado" />;
    case "professor":
      return <AreaProvisoria nome="convite de professor" area="convidado" />;
  }
}

type ConviteComProfessorProps = {
  titulo: string;
  texto: string;
  professor: string;
  botao: string;
  aoTocar: () => void;
  children?: React.ReactNode;
};

/** Convite válido: título, texto, cartão "SEU PROFESSOR" e o botão principal no rodapé. */
function ConviteComProfessor({
  titulo,
  texto,
  professor,
  botao,
  aoTocar,
  children,
}: ConviteComProfessorProps) {
  return (
    <Tela barra="um">
      <div className="flex flex-col gap-16 pt-40">
        <h1 className="text-title-lg text-text-primary">{titulo}</h1>
        <p className="text-body text-text-secondary">{texto}</p>
        <div className="flex flex-col gap-8 rounded-card bg-bg-surface p-20">
          <span className="text-overline text-text-secondary">Seu professor</span>
          <span className="truncate text-title-card text-text-primary">Prof. {professor}</span>
          <span className="text-caption text-text-secondary">Convite válido por 7 dias</span>
        </div>
        {children}
      </div>
      <BarraFixa>
        <Button onClick={aoTocar}>{botao}</Button>
      </BarraFixa>
    </Tela>
  );
}

type ConviteSemValorProps = {
  icone: NomeIcone;
  titulo: string;
  botao?: { texto: string; aoTocar: () => void };
  children: React.ReactNode;
};

/** Convite expirado, já usado ou substituído: estado vazio, no máximo um botão. */
function ConviteSemValor({ icone, titulo, botao, children }: ConviteSemValorProps) {
  return (
    <Tela barra={botao ? "um" : undefined}>
      <EmptyState icone={icone} titulo={titulo} className="flex-1 justify-center">
        {children}
      </EmptyState>
      {botao && (
        <BarraFixa>
          <Button onClick={botao.aoTocar}>{botao.texto}</Button>
        </BarraFixa>
      )}
    </Tela>
  );
}
