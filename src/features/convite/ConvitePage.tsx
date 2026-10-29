import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AreaProvisoria } from "@/features/acesso/AreaProvisoria";
import { ErroApp, erroDaResposta } from "@/lib/erros";
import { rpc } from "@/lib/rpc";
import { estadoSessaoQuery, sair } from "@/lib/sessao";
import {
  BarraFixa,
  Button,
  EmptyState,
  Notice,
  Tela,
  TextButton,
  useToast,
  type NomeIcone,
} from "@/ui";
import { apagarConviteGuardado, guardarConvite } from "./conviteGuardado";
import { telaDoErroDoConvite, type TelaDoConvite } from "./telaDoConvite";

type ConvitePageProps = { tela: TelaDoConvite; token: string };

/**
 * Link do convite (regras 46, 48, 79, 82, 97 e 102; Figma "Aluno · Entrada", seções 1, 2, 8 e
 * 10). Sem navegação inferior. Ao sair para criar a conta ou entrar, o convite fica guardado no
 * aparelho para o app voltar a ele depois do login; convite que não vale mais apaga o guardado.
 */
export function ConvitePage({ tela: telaInicial, token }: ConvitePageProps) {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const mostrarToast = useToast();
  // A resposta do banco pode trocar a tela: "Conta vinculada", ou o convite mudou no caminho.
  // Fica no estado da tela: se o loader rodar de novo (ex.: SIGNED_IN ao voltar ao app), o
  // convite já aparece como usado, e "Conta vinculada" não pode virar "já foi usado".
  const [tela, setTela] = useState<TelaDoConvite | { tela: "vinculada"; professor: string }>(
    telaInicial,
  );
  const [enviando, setEnviando] = useState(false);

  // Quem chega logado já está no convite (ou num que não vale mais): o guardado cumpriu o papel.
  const consome = telaInicial.tela !== "valido" && telaInicial.tela !== "ja_tem_conta";
  useEffect(() => {
    if (consome) apagarConviteGuardado();
  }, [consome]);

  function seguir(destino: "/criar-conta" | "/entrar", email: string | null) {
    guardarConvite(token);
    void navegar({ to: destino, search: email ? { email } : {} });
  }

  /** Vincular ou recusar: erro com tela própria troca a tela; os demais viram toast. */
  async function responder(funcao: "accept_student_invite" | "decline_invite", professor: string) {
    setEnviando(true);
    try {
      await rpc(funcao, { p_token: token });
    } catch (causa) {
      const erro = causa instanceof ErroApp ? causa : erroDaResposta(causa);
      const outraTela = telaDoErroDoConvite(erro.codigo, professor);
      if (outraTela) setTela(outraTela);
      else mostrarToast("error", erro.message);
      setEnviando(false);
      return;
    }
    if (funcao === "decline_invite") {
      await navegar({ to: "/", replace: true });
      return;
    }
    // Vincular muda o destino (primeiro acesso ou início): a sessão é lida de novo.
    queryClient.removeQueries({ queryKey: estadoSessaoQuery.queryKey });
    setTela({ tela: "vinculada", professor });
  }

  /** "Usar outra conta" (regra 97): sai só neste aparelho e volta ao convite depois do login. */
  async function usarOutraConta() {
    setEnviando(true);
    guardarConvite(token);
    await sair();
    await navegar({ to: "/entrar" });
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
    case "vincular":
      return (
        <ConviteComProfessor
          titulo="Vincular ao professor?"
          texto={`Com o vínculo, o professor ${tela.professor} monta os seus treinos e acompanha a sua frequência.`}
          professor={tela.professor}
          botao="Vincular ao professor"
          aoTocar={() => void responder("accept_student_invite", tela.professor)}
          secundario={{
            texto: "Agora não",
            aoTocar: () => void responder("decline_invite", tela.professor),
          }}
          enviando={enviando}
        >
          <div className="flex flex-col items-start">
            <p className="text-body text-text-secondary">Você está entrando como {tela.email}.</p>
            <TextButton onClick={() => void usarOutraConta()} disabled={enviando}>
              Usar outra conta
            </TextButton>
          </div>
          <Notice tom="info" titulo="O professor vê seus dados">
            Nome, nascimento, telefone, altura, peso e restrições ou dores, para montar o treino e
            falar com você. Altura e peso podem ser compartilhados em qualquer idade; restrições ou
            dores são dados de saúde (LGPD).
          </Notice>
        </ConviteComProfessor>
      );
    case "vinculada":
      return (
        <ConviteSemValor
          icone="check_circle"
          titulo="Conta vinculada"
          botao={{ texto: "Ir para o início", aoTocar: () => navegar({ to: "/", replace: true }) }}
        >
          O professor {tela.professor} agora monta os seus treinos. Eles aparecem no seu início.
        </ConviteSemValor>
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
    // Provisório: a entrada do professor vem no #49.
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
  /** Botão de contorno abaixo do principal (ex.: "Agora não"). */
  secundario?: { texto: string; aoTocar: () => void };
  enviando?: boolean;
  children?: ReactNode;
};

/** Convite válido: título, texto, cartão "SEU PROFESSOR" e os botões no rodapé. */
function ConviteComProfessor({
  titulo,
  texto,
  professor,
  botao,
  aoTocar,
  secundario,
  enviando = false,
  children,
}: ConviteComProfessorProps) {
  return (
    <Tela barra={secundario ? "dois" : "um"}>
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
        <Button onClick={aoTocar} disabled={enviando}>
          {botao}
        </Button>
        {secundario && (
          <Button variante="secondary" onClick={secundario.aoTocar} disabled={enviando}>
            {secundario.texto}
          </Button>
        )}
      </BarraFixa>
    </Tela>
  );
}

type ConviteSemValorProps = {
  icone: NomeIcone;
  titulo: string;
  botao?: { texto: string; aoTocar: () => void };
  children: ReactNode;
};

/** Convite sem valor (expirado, já usado, substituído) e "Conta vinculada": até um botão. */
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
