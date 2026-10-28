import { useState, type ReactNode } from "react";
import {
  BackButton,
  Button,
  ButtonCompact,
  Chip,
  EmptyState,
  ESPACO_NAVBAR,
  FormField,
  IconButton,
  NavBar,
  Notice,
  PhoneField,
  SectionRow,
  Sheet,
  TextAreaField,
  TextButton,
  Toast,
  ToastProvider,
  useToast,
  type AbaAluno,
} from "@/ui";

// Catálogo dos componentes base (Fase 0, item 3) para conferir com a página Componentes do Figma.

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-12">
      <h2 className="text-overline text-text-secondary">{titulo}</h2>
      {children}
    </section>
  );
}

function Tokens() {
  const cores = [
    "bg-canvas",
    "bg-surface",
    "bg-surface-raised",
    "bg-brand",
    "bg-brand-subtle",
    "bg-success-subtle",
    "bg-info-subtle",
    "bg-neutral-subtle",
    "bg-warning-subtle",
    "border-default",
    "border-danger",
    "text-primary",
    "text-secondary",
    "text-disabled",
    "status-success",
    "status-warning",
    "status-info",
    "status-danger",
  ];
  return (
    <ul className="grid grid-cols-3 gap-8">
      {cores.map((nome) => (
        <li key={nome} className="flex flex-col gap-4">
          <span
            className="h-32 rounded-inset border border-border-subtle"
            style={{ background: `var(--color-${nome})` }}
          />
          <span className="truncate text-caption text-text-secondary">{nome}</span>
        </li>
      ))}
    </ul>
  );
}

function Demonstracoes() {
  const mostrarToast = useToast();
  const [folha, setFolha] = useState(false);
  const [aba, setAba] = useState<AbaAluno>("inicio");
  const [codigo, setCodigo] = useState("+55");

  return (
    <main
      className={`mx-auto flex max-w-screen flex-col gap-32 px-screen-margin pt-40 ${ESPACO_NAVBAR}`}
    >
      <header className="flex flex-col gap-16">
        <BackButton onClick={() => history.back()} />
        <h1 className="text-title-screen">Componentes</h1>
        <p className="text-body text-text-secondary">
          Componentes base da Fase 0. Compare com a página Componentes do Figma.
        </p>
      </header>

      <Secao titulo="Tokens">
        <Tokens />
      </Secao>

      <Secao titulo="Button">
        <Button>Ver ficha</Button>
        <Button variante="secondary">Solicitar novo treino</Button>
        <Button disabled>Solicitação enviada</Button>
      </Secao>

      <Secao titulo="ButtonCompact, TextButton, IconButton">
        <div className="flex items-center gap-12">
          <ButtonCompact>Editar</ButtonCompact>
          <ButtonCompact tamanho="sm">Marcar</ButtonCompact>
        </div>
        <div className="flex items-center gap-16">
          <TextButton>Esqueci a senha</TextButton>
          <TextButton tom="muted">Já tenho acesso? Entrar</TextButton>
        </div>
        <div className="flex items-center gap-12">
          <IconButton icone="chevron_left" rotulo="Anterior" superficie="card" />
          <IconButton icone="chevron_right" rotulo="Próxima" />
          <IconButton icone="remove" rotulo="Menos" tamanho="sm" disabled />
          <IconButton icone="add" rotulo="Mais" tamanho="sm" />
        </div>
      </Secao>

      <Secao titulo="Chip">
        <div className="flex flex-wrap gap-8">
          <Chip tom="brand">Ficha de hoje</Chip>
          <Chip tom="info">Descanso</Chip>
          <Chip tom="success">✓ Feita hoje</Chip>
          <Chip tom="neutral">Aguardando envio</Chip>
          <Chip tom="warning">Quase no fim</Chip>
        </div>
      </Secao>

      <Secao titulo="Notice">
        <Notice tom="info" titulo="O professor vê seus dados">
          Nome, nascimento, telefone, altura, peso e restrições, para montar o treino.
        </Notice>
        <Notice tom="neutral" titulo="Sem conexão">
          Seus registros ficam guardados e são enviados quando a internet voltar.
        </Notice>
        <Notice tom="danger" titulo="Adicione pelo menos uma ficha">
          O treino precisa de uma ficha com exercícios para ser salvo.
        </Notice>
      </Secao>

      <Secao titulo="FormField, PhoneField">
        <FormField rotulo="E-mail" tipo="email" placeholder="seuemail@exemplo.com" />
        <FormField rotulo="Nome" defaultValue="Vinicius" />
        <FormField rotulo="Senha" tipo="password" defaultValue="segredo123" />
        <FormField rotulo="Nome" defaultValue="V" erro="Digite seu nome completo." />
        <TextAreaField rotulo="Restrições ou dores" placeholder="Ex.: dor leve no ombro" />
        <PhoneField
          rotulo="Telefone (WhatsApp)"
          placeholder="(11) 91234-5678"
          codigoPais={codigo}
          aoMudarCodigoPais={setCodigo}
        />
        <PhoneField
          rotulo="Telefone (WhatsApp)"
          defaultValue="(31) 98765-43"
          erro="Digite um telefone com DDD, como (31) 91234-5678."
        />
      </Secao>

      <Secao titulo="SectionRow">
        <SectionRow
          icone="trending_up"
          titulo="Progressão de carga"
          detalhe="12 exercícios com carga registrada"
        />
        <SectionRow
          icone="fitness_center"
          titulo="Supino inclinado com halteres e pausa no peito"
          detalhe="Peito · nome longo trunca em uma linha"
          iconeDireita="more_horiz"
        />
      </Secao>

      <Secao titulo="Toast">
        <Toast tom="success">Treino marcado. Bom trabalho!</Toast>
        <Toast tom="error">E-mail ou senha não conferem.</Toast>
        <Button variante="secondary" onClick={() => mostrarToast("success", "Registros enviados.")}>
          Mostrar toast no topo
        </Button>
      </Secao>

      <Secao titulo="Sheet">
        <Button variante="secondary" onClick={() => setFolha(true)}>
          Abrir folha
        </Button>
        <Sheet
          aberta={folha}
          aoFechar={() => setFolha(false)}
          titulo="Sair do app?"
          acoes={
            <>
              <Button onClick={() => setFolha(false)}>Continuar no app</Button>
              <Button variante="secondary" onClick={() => setFolha(false)}>
                Sair
              </Button>
            </>
          }
        >
          Você vai precisar entrar de novo com e-mail e senha.
        </Sheet>
      </Secao>

      <Secao titulo="EmptyState">
        <EmptyState icone="history" titulo="Nenhum treino anterior">
          Quando um novo treino for ativado, o atual aparece aqui.
        </EmptyState>
      </Secao>

      <Secao titulo="NavBar (fixa embaixo)">
        <p className="text-body text-text-secondary">Aba ativa: {aba}</p>
      </Secao>

      <NavBar ativa={aba} aoEscolher={setAba} />
    </main>
  );
}

export function ComponentesPage() {
  return (
    <ToastProvider>
      <Demonstracoes />
    </ToastProvider>
  );
}
