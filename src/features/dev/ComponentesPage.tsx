import { useState, type ReactNode } from "react";
import {
  ActiveWorkoutCard,
  BackButton,
  Button,
  ButtonCompact,
  CheckboxRow,
  Chip,
  DateField,
  EmptyState,
  ESPACO_NAVBAR,
  FormField,
  IconButton,
  NavBar,
  Notice,
  NumberField,
  PhoneField,
  QuickPick,
  SectionRow,
  Sheet,
  StepIndicator,
  SegmentedControl,
  Stepper,
  StudentRow,
  TextAreaField,
  TextButton,
  Toast,
  useToast,
  type AbaAluno,
} from "@/ui";
import { ListaReordenavel, ReorderRow } from "@/ui/ReorderRow";
import { FolhaSair } from "@/features/acesso/FolhaSair";
import { FolhaDoExercicio } from "@/features/treino/FolhaDoExercicio";

// Catálogo dos componentes base (Fase 0, item 3) para conferir com a página Componentes do Figma.

const OPCOES_DE_MEDIDA = [
  { valor: "Repetições", rotulo: "Repetições" },
  { valor: "Tempo", rotulo: "Tempo" },
];
const OPCOES_DE_CARGA = [
  { valor: "Sim", rotulo: "Sim" },
  { valor: "Opcional", rotulo: "Opcional" },
  { valor: "Não", rotulo: "Não" },
];

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-12">
      <h2 className="text-overline text-text-secondary">{titulo}</h2>
      {children}
    </section>
  );
}

function CaixaDeExemplo() {
  const [marcada, setMarcada] = useState(false);
  return (
    <CheckboxRow checked={marcada} onChange={(e) => setMarcada(e.target.checked)}>
      Li e entendi que o professor acessa esses dados para montar o meu treino.
    </CheckboxRow>
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

const HOJE_EXEMPLO = "2026-10-29";

const MAXIMO_DE_SEMANAS = 104;
const ERRO_DE_SEMANAS = "Use de 1 a 104 semanas.";

const semanas = (n: number) => (n === 1 ? "1 semana" : `${n} semanas`);

const FICHAS_EXEMPLO = [
  { id: "a", titulo: "Ficha A · Peito e tríceps", detalhe: "6 exercícios", comProblema: false },
  { id: "b", titulo: "Ficha B · Costas e bíceps", detalhe: "Sem exercícios", comProblema: true },
  { id: "c", titulo: "Ficha C · Pernas e glúteos", detalhe: "7 exercícios", comProblema: false },
  {
    id: "d",
    titulo: "Ficha D · Nome bem comprido que trunca em uma linha só",
    detalhe: "4 séries · 10 reps · Descanso 90 s · detalhe comprido também trunca",
    comProblema: false,
  },
];

function Demonstracoes() {
  const mostrarToast = useToast();
  const [numeroDeSemanas, setNumeroDeSemanas] = useState(8);
  const [medida, setMedida] = useState("Repetições");
  const [carga, setCarga] = useState("Sim");
  const [descanso, setDescanso] = useState<number | null>(90);
  const [inicio, setInicio] = useState(HOJE_EXEMPLO);
  const [fichas, setFichas] = useState(FICHAS_EXEMPLO);
  const [folha, setFolha] = useState(false);
  const [folhaSair, setFolhaSair] = useState(false);
  const [folhaExercicio, setFolhaExercicio] = useState<"reps" | "time" | null>(null);
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

      <Secao titulo="ActiveWorkoutCard">
        <ActiveWorkoutCard
          nome="Hipertrofia · Fase 2"
          situacao="Semana 4 de 8"
          progresso={25 / 56}
          feitos={12}
          inicio="05/10"
          fim="29/11"
        />
        <ActiveWorkoutCard
          nome="Treino com um nome longo demais para caber em uma só linha"
          situacao="Treino concluído"
          progresso={1}
          feitos={1}
          inicio="05/10"
          fim="29/11"
        />
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

      <Secao titulo="StepIndicator">
        <StepIndicator passo={1} total={2} />
        <StepIndicator passo={2} total={2} />
      </Secao>

      <Secao titulo="CheckboxRow">
        <CaixaDeExemplo />
      </Secao>

      <Secao titulo="FormField, PhoneField">
        <FormField rotulo="E-mail" tipo="email" placeholder="seuemail@exemplo.com" />
        <FormField rotulo="Nome" defaultValue="Vinicius" />
        <FormField rotulo="Senha" tipo="password" defaultValue="segredo123" />
        <FormField
          rotulo="Senha"
          tipo="password"
          placeholder="Crie uma senha"
          dica="Mínimo de 8 caracteres, com letras e números."
        />
        <FormField
          rotulo="Senha"
          tipo="password"
          defaultValue="abcdefgh"
          dica="Mínimo de 8 caracteres, com letras e números."
          erro="A senha precisa ter pelo menos 8 caracteres, com letras e números."
        />
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

      <Secao titulo="SegmentedControl">
        <SegmentedControl
          rotulo="Medida"
          opcoes={OPCOES_DE_MEDIDA}
          valor={medida}
          aoMudar={setMedida}
        />
        <SegmentedControl
          rotulo="Modo de carga"
          opcoes={OPCOES_DE_CARGA}
          valor={carga}
          aoMudar={setCarga}
        />
      </Secao>

      <Secao titulo="QuickPick">
        <div className="flex gap-8">
          {[30, 45, 60, 90, 120].map((segundos) => (
            <QuickPick
              key={segundos}
              selecionado={descanso === segundos}
              onClick={() => setDescanso(descanso === segundos ? null : segundos)}
            >
              {segundos} s
            </QuickPick>
          ))}
          <QuickPick selecionado={false}>Outro</QuickPick>
        </div>
      </Secao>

      <Secao titulo="NumberField">
        <div className="grid grid-cols-2 gap-16">
          <NumberField aria-label="Séries" placeholder="Ex.: 4" />
          <NumberField aria-label="Tempo" formato="suffix" defaultValue="45" />
        </div>
        <div className="flex items-center gap-8">
          <NumberField aria-label="Mínimo" formato="center" defaultValue="8" />
          <span aria-hidden="true">a</span>
          <NumberField aria-label="Máximo" formato="center" defaultValue="12" />
        </div>
        <NumberField aria-label="Com erro" invalido defaultValue="601" />
      </Secao>

      <Secao titulo="Stepper">
        <Stepper
          rotulo="Número de semanas"
          valor={numeroDeSemanas}
          aoMudar={setNumeroDeSemanas}
          formatar={semanas}
          maximo={MAXIMO_DE_SEMANAS}
          erroMaximo={ERRO_DE_SEMANAS}
        />
        <Stepper
          rotulo="No mínimo"
          valor={1}
          aoMudar={() => {}}
          formatar={semanas}
          maximo={MAXIMO_DE_SEMANAS}
          erroMaximo={ERRO_DE_SEMANAS}
        />
        <Stepper
          rotulo="No máximo"
          valor={MAXIMO_DE_SEMANAS}
          aoMudar={() => {}}
          formatar={semanas}
          maximo={MAXIMO_DE_SEMANAS}
          erroMaximo={ERRO_DE_SEMANAS}
        />
      </Secao>

      <Secao titulo="DateField e seletor de data (hoje = 29/10/2026)">
        <DateField rotulo="Início" valor={inicio} hoje={HOJE_EXEMPLO} aoMudar={setInicio} />
        <DateField
          rotulo="Início futuro"
          valor="2026-11-03"
          hoje={HOJE_EXEMPLO}
          aoMudar={() => {}}
        />
      </Secao>

      <Secao titulo="ReorderRow">
        <ListaReordenavel itens={fichas} aoReordenar={setFichas}>
          {(ficha, indice) => (
            <ReorderRow
              key={ficha.id}
              id={ficha.id}
              indice={indice}
              titulo={ficha.titulo}
              detalhe={ficha.detalhe}
              comProblema={ficha.comProblema}
              onClick={() => mostrarToast("success", `Abrir ${ficha.titulo}`)}
            />
          )}
        </ListaReordenavel>
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

      <Secao titulo="StudentRow">
        <StudentRow
          nome="Juliana Costa"
          status={{ tom: "success", texto: "Ativo" }}
          solicitacao={{ tom: "brand", texto: "Pediu treino" }}
          detalhe="Treino concluído em 25/10 · treinou ontem"
        />
        <StudentRow
          nome="Marcos Lima"
          status={{ tom: "warning", texto: "Quase no fim" }}
          detalhe="Fim em 03/11 · treinou ontem"
        />
        <StudentRow
          nome="Rafael Torres"
          status={{ tom: "info", texto: "Convite pendente" }}
          detalhe="Convite enviado em 27/10 · vale até 03/11"
          onClick={() => undefined}
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

      <Secao titulo="Folha Editar exercício (regra 159)">
        <Button variante="secondary" onClick={() => setFolhaExercicio("reps")}>
          Abrir (repetições)
        </Button>
        <Button variante="secondary" onClick={() => setFolhaExercicio("time")}>
          Abrir (tempo)
        </Button>
        {folhaExercicio && (
          <FolhaDoExercicio
            nome={folhaExercicio === "time" ? "Prancha frontal" : "Supino reto"}
            medida={folhaExercicio}
            aoFechar={() => setFolhaExercicio(null)}
            aoSalvar={() => setFolhaExercicio(null)}
            aoRemover={() => setFolhaExercicio(null)}
          />
        )}
      </Secao>

      <Secao titulo="FolhaSair (Perfil, regra 121)">
        <Button variante="secondary" onClick={() => setFolhaSair(true)}>
          Abrir "Sair do app?"
        </Button>
        <FolhaSair aberta={folhaSair} aoFechar={() => setFolhaSair(false)} />
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

// O ToastProvider vem da rota raiz.
export const ComponentesPage = Demonstracoes;
