# Coach In · design.md

Referência única do design system para criar telas e código. Leia junto com `docs/contexto/contexto-produto.md` (regras de negócio) e `docs/contexto/handoff-design-system.md` (manhas do plugin do Figma). Fonte de verdade visual: arquivo Figma **Coach In** (`IDP8M2IKanbn60dyqmzjh1`), páginas **Style guide** e **Componentes**. Os nomes de página do Figma estão em `docs/contexto/figma-paginas.md`.

Estrutura: **Parte 1 (fixa)** tokens, tipografia, regras e padrões de tela. **Parte 2 (viva)** catálogo de componentes, atualizado a cada componente novo.

---

# Parte 1 · Fixa

## 1. Princípios
- Um único botão laranja (`Button primary`) por tela. Ações secundárias em contorno ou texto. A caixa marcada do `CheckboxRow` também usa laranja, mas é controle de seleção, não botão. O chip `tone=brand` também é laranja, mas é só rótulo.
- Gradiente só na barra de progresso (`gradient/brand-progress`), um por tela.
- Tom acolhedor, **nunca culpa**: dia sem treino em tom neutro ("Sem registro"), sem vermelho. Vermelho (`status/danger`) só para erro ou ação destrutiva. Erros transitórios (ex.: login) vão em `Toast tone=error`; erros de validação de tela (ex.: treino sem ficha) vão em `Notice tone=danger`; ações de cancelar, remover, descartar, sair ou excluir a própria conta usam contorno, não vermelho. Convite expirado **não** é erro: usa tom neutro. **Ficar sem internet também não é erro**: tom neutro (regra 116). **Sessão expirada também não é erro**: é só o Login com o título "Entre de novo" (regra 121).
- Sem vídeo, GIF ou link de demonstração em lugar nenhum (fora do MVP).
- App escuro, um único tema (modo `dark`). Todo texto em pt-BR.
- **Tudo em múltiplos de 4** (mais 0 e 2): espaçamento, raios, tamanhos de fonte, alturas de linha. Nunca usar 3, 5, 6, 10, 14… Única exceção: `text/nav-label` com 10 px (só rótulo da NavBar). Divisores de 1 px e bordas de 1/2/4 são permitidos.
- Nunca usar valores soltos: sempre variáveis (cores, espaço, raio) e estilos de texto do Figma.

## 2. Convenção de nomes
- Variáveis em inglês, minúsculas, com barras. Mapeiam direto para CSS/Tailwind: `color/bg/surface` → `var(--color-bg-surface)`, `space/16` → `var(--spacing-16)`. **Em código** (`src/styles/tokens.css`, Tailwind v4): `color/bg/surface` → `bg-bg-surface`, `space/16` → `p-16`/`gap-16`, `radius/control` → `rounded-control`, estilo `text/body-strong` → classe `text-body-strong`, `gradient/brand-progress` → `bg-brand-progress`. A escala padrão do Tailwind não existe: só os tokens.
- Duas camadas: **Primitives** (valores brutos, sem uso direto em telas) e **Tokens** (papéis semânticos; é o que telas e componentes usam). Em código, usar sempre Tokens.
- Componentes em PascalCase inglês (`Button`, `NavBar`), variantes como propriedades (`variant=primary`, `active=home`, `state=today, selected=true`). Textos visíveis em pt-BR.
- Ícones: `Icon/<nome_material>` com variante `style=outline|filled`.

## 3. Cores

### Tokens (use estes)
| Token | Valor | Uso |
|---|---|---|
| color/bg/canvas | #121212 | Fundo da tela |
| color/bg/surface | #1E1E1E | Cartões, linhas |
| color/bg/surface-raised | #2A2A2A | Chips, aba ativa, setas, campos, botão desabilitado, elementos sobre cartão |
| color/bg/scrim | #000000 @60% | Fundo escurecido atrás de folhas |
| color/bg/brand | #FF8A3D | Botão primary, círculo de destaque, caixa marcada |
| color/bg/brand-subtle | #FF8A3D @16% | Chip "Ficha de hoje", chip "Pediu treino" |
| color/bg/success-subtle | #4DDBA6 @16% | Chip "Feita hoje", chip "Ativo" |
| color/bg/info-subtle | #8AB4F8 @16% | Chip "Descanso", chip "Convite pendente", `Notice tone=info` |
| color/bg/neutral-subtle | #A3A3A3 @16% | Chip "Treino encerrado", "Sem treino", "Convite expirado", **"Aguardando envio"** |
| color/bg/warning-subtle | #FFC857 @16% | Chip "Quase no fim" |
| color/border/subtle | #2A2A2A | Divisores, bordas de cartão |
| color/border/default | #3A3A3A | Borda de botão secundário, campos, divisor do telefone e caixa desmarcada |
| color/border/strong | #4A4A4A | Bordas em destaque neutro |
| color/border/brand | #FF8A3D | Borda do cartão "Ficha de hoje", anel do dia atual |
| color/border/danger | #4A3331 | Erro/destrutivo (campo com erro, `Notice tone=danger`, linha de ficha sem exercício) |
| color/text/primary | #E6E6E6 | Texto principal |
| color/text/secondary | #A3A3A3 | Apoio, rótulos |
| color/text/disabled | #A3A3A3 @55% | Dias futuros, desabilitado, placeholder de campo |
| color/text/on-brand | #121212 | Texto sobre laranja |
| color/text/brand | #FF8A3D | Destaque laranja (semana, dia de hoje) |
| color/text/brand-soft | #FFB27A | Laranja claro |
| color/status/success | #4DDBA6 | Feito, marca verde do dia, ícone do toast de sucesso |
| color/status/warning | #FFC857 | Atenção, texto do chip "Quase no fim" |
| color/status/info | #8AB4F8 | Info, descanso, links |
| color/status/danger | #F28B82 | Só erro/destrutivo (ícone do toast de erro, texto de erro do campo, "Sem exercícios") |

### Primitives
neutral/900 #121212 · 800 #1E1E1E · 700 #2A2A2A · 600 #3A3A3A · 500 #4A4A4A · 300 #A3A3A3 · 100 #E6E6E6 · 0 #000000 · orange/600 #E8691A · 500 #FF8A3D · 300 #FFB27A · green/400 #4DDBA6 · yellow/400 #FFC857 · blue/300 #8AB4F8 · red/300 #F28B82 · red/900 #4A3331.
Gradiente `gradient/brand-progress`: #FF8A3D → #FFB27A.

## 4. Tipografia
Jost Bold para títulos e nomes de ficha/treino. Inter para o resto.

| Estilo | Fonte | Tamanho/linha | Uso |
|---|---|---|---|
| text/display | Jost Bold | 40/48 | Saudação grande ("Olá, Vinicius") |
| text/title-lg | Jost Bold | 32/40 | Nome da ficha em destaque; título do convite |
| text/title-screen | Jost Bold | 28/32 | Título de tela |
| text/title-md | Jost Bold | 24/32 | Título de folha |
| text/title-sm | Jost Bold | 20/24 | Subtítulos, estado vazio |
| text/title-card | Inter SemiBold | 20/24 | Título de cartão |
| text/number-display | Inter Bold | 56/64 | Número gigante |
| text/number-xl | Inter Bold | 32/40 | Carga |
| text/number-lg | Inter Bold | 28/32 | Números de destaque |
| text/number-md | Inter Bold | 20/24 | Números médios |
| text/body | Inter Regular | 16/24 | Corpo |
| text/body-medium | Inter Medium | 16/24 | Corpo com ênfase leve |
| text/body-strong | Inter SemiBold | 16/24 | Nomes em linhas, botões |
| text/body-bold | Inter Bold | 16/24 | Ênfase forte |
| text/caption | Inter Regular | 12/16 | Apoio, datas, texto de erro de campo |
| text/label | Inter Medium | 12/16 | Rótulos |
| text/label-strong | Inter SemiBold | 12/16 | Rótulos fortes |
| text/label-bold | Inter Bold | 12/16 | Chips |
| text/overline | Inter SemiBold | 12/16, +8% | Rótulo de seção em CAIXA ALTA |
| text/link | Inter SemiBold | 16/24, sublinhado | Links (cor status/info) |
| text/nav-label | Inter Medium | 10/16 | **Só** rótulo da NavBar |

Nota do plugin: no Figma o peso SemiBold da Inter se chama **"Semi Bold"** (com espaço) ao carregar a fonte.

## 5. Espaçamento, raios, bordas, efeitos
- **Espaço:** 0, 2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48 (`space/N`). Tokens: `space/screen-margin` = 20, `space/card-padding` = 20.
- **Raio (tokens):** control 16 (botões, campos), card 24 (cartões), tile 20 (células/blocos, `Notice`, linhas de lista), inset 12 (blocos dentro de cartão), sheet 28 (topo de folhas), pill 999 (chips, abas, círculos). Primitives: xs 4, sm 8, md 12, lg 16, xl 20, 2xl 24, 3xl 28, full 999.
- **Bordas:** `stroke/1`, `stroke/2`, `stroke/4`. Botão secundário 1 px (`border/default`); cartão "Ficha de hoje" 2 px (`border/brand`); campo 2 px (`border/subtle`, erro com `border/danger`).
- **Sombras:** `shadow/raised` (toast, menu inferior), `shadow/sheet` (folhas). Só em elementos elevados.

## 6. Padrões de tela
- **Tela:** 390 de largura, margem lateral 20, conteúdo (cartões) com 350 de largura, fundo `color/bg/canvas`. Layout vertical com auto layout; espaço entre blocos em múltiplos de 4.
- **Topo:** `StatusBar` (apresentação) + `Logo` + título da tela (`text/title-screen` ou `text/display` na home).
- **Menu inferior (`NavBar`)** (só aluno): 362×68, flutuante, posição absoluta com `y = alturaDaTela − 105`; `HomeIndicator` em `y = alturaDaTela − 25`. Ambos ficam por **cima** de todo o conteúdo (último filho). O conteúdo deve terminar antes do topo do menu (deixar ≥ 105 px livres embaixo); se o conteúdo crescer, aumentar a altura da tela.
- **Telas sem menu:** Ficha, detalhe do exercício, Editar dados, **todas as telas de entrada** (convite, criar acesso, primeiro acesso, login, esqueci a senha, **sem professor, conta bloqueada**) e **todas as telas do professor** (formato celular, sem menu; a Lista de alunos é a raiz). Elas usam botão de voltar (círculo 40, `IconButton size=lg, surface=raised`, ícone `arrow_back`) quando há tela anterior, e barra fixa de botão no rodapé (frame absoluto 390×100, `y = alturaDaTela − 100`, padding 16/20/32/20, fundo `canvas`, com `Button` FILL) com `HomeIndicator` por cima em `y = alturaDaTela − 25`.
- **Barra fixa com dois botões** (lote 4A): mesma barra, com altura 164 (padding 16/20/32/20, espaço de 12 entre os botões): `Button primary` em cima e `Button secondary` embaixo. `y = alturaDaTela − 164`. Na tela do aluno do professor, "Editar treino" e "Agendar novo treino" são ambos `secondary`.
- **Barra fixa só com `Button secondary`** (lote 4B): usada na tela do aluno do professor, para "Editar treino" quando não há ação principal (ex.: com treino agendado), e na tela de conta bloqueada ("Sair").
- **Quando uma tela cresce** (campo novo, aviso novo): aumentar a altura do frame e mover a barra fixa e o `HomeIndicator` (`y = novaAltura − 100/164` e `− 25`); o `Escurecimento` de folhas acompanha a altura; o rótulo abaixo do frame e a seção também. Na Home, o menu inferior vai para `y = novaAltura − 105`.
- **Folhas inferiores:** sobre `color/bg/scrim`, topo com raio `radius/sheet`, `SheetHandle` no topo, `shadow/sheet`. Frame vertical, 390 de largura, padding 12/20/48/20, espaço 16, fundo `color/bg/surface`, `HomeIndicator` absoluto por cima (`y = alturaDaFolha − 25`); a altura é a do conteúdo (HUG) e `y = alturaDaTela − alturaDaFolha`. **Se o texto da folha ganhar linhas, a folha cresce para cima: subtrair o aumento do `y` e recolocar o `HomeIndicator`.** Usadas no painel do dia, editar carga, cancelar solicitação, **seletor de data, editar exercício, ocultar da busca, remover ficha, cancelar agendamento, descartar alterações, treino novo, sair do app e excluir a conta**. Folha de confirmação: título `text/title-md`, texto `text/body` secundário (ou `Notice`), `Button primary` para manter e `Button secondary` para confirmar a ação sem vermelho.
- **Pop-up de treino novo (regra 117):** folha de confirmação sobre a Home ("Seu treino novo chegou"), com `Button primary` "Ver meu treino" e `Button secondary` "Fechar". Não é toast: precisa de uma ação do aluno.
- **Avisos:** `Toast` escuro, `tone=success` (ícone verde) ou `tone=error` (ícone vermelho com ×). Acima do menu, ou absoluto no topo (x 20, y 52) em telas sem menu, na Home com toast e no Perfil. **A mensagem tem de caber em uma linha (≈ 30 caracteres)**; e-mails longos não entram no texto do toast. "Conta excluída." usa `tone=success` sobre o Login (regra 120).
- **Sem conexão (regra 116):** `Notice tone=neutral` ("Sem conexão") no topo da Home, logo abaixo da saudação (a tela cresce); `Toast tone=success` para "Guardado. Envio quando voltar." e "Registros enviados."; `Chip tone=neutral` "AGUARDANDO ENVIO" no lugar do chip "Feita hoje" da ficha; na folha de editar carga, o texto de apoio vira o aviso de conexão. Sem vermelho. Primeira abertura sem conexão e sem treino guardado: `EmptyState` "Sem conexão" com `Button primary` "Tentar de novo". **Telas que exigem conexão (desenhadas):** Frequência (meses anteriores), Progressão e Histórico usam `EmptyState` "Sem conexão" com "Tentar de novo" e o menu inferior; "Solicitar novo treino" e "Excluir minha conta" abrem uma folha "Sem conexão" ("Tentar de novo" principal, "Fechar" em contorno); "Editar dados" mostra `Notice tone=neutral` "Sem conexão" e mantém "Salvar alterações" habilitado.
- **Textos longos (regra 114):** nomes (treino, ficha, exercício, aluno) **truncam em 1 linha com "…"**, em todos os componentes de lista e cartão. Exceção: o **nome do exercício no card da ficha** e a **prévia da "Ficha de hoje"** vão até 2 linhas. A observação do exercício quebra linha normalmente. Para o truncamento funcionar, o texto precisa estar com largura `FILL` no pai (e o pai, ancestral por ancestral, também `FILL` até uma largura fixa), `textTruncation = ENDING` e `maxLines` definido. Nunca deixar texto de nome em `HUG` dentro de linha de lista. Listas grandes rolam; o botão principal fica fixo no rodapé.
- **Estados vazios:** `EmptyState` centralizado (círculo 88 com ícone, título, texto). Usado também nas telas de convite expirado/usado, de "e-mail enviado" / "senha alterada", de lista vazia ou busca sem resultado, do convite gerado (ícone `check_circle`), do **treino salvo / agendado** e de **conta bloqueada**.
- **Formulários:** `FormField` empilhados com 16 de espaço; erro de campo = `state=error` com texto `text/caption` em `status/danger` abaixo; placeholder em `text/disabled` (`state=empty`). **Campos de uma linha têm o texto centralizado na vertical (sem padding vertical)**; o ícone de mostrar/ocultar da senha fica na ponta direita. Telefone usa `PhoneField` (código do país + número). Passos de um mesmo fluxo usam `StepIndicator`. Para número com − e + use `Stepper` (o − fica a 35% de opacidade no mínimo); para data use `DateField` (abre o seletor de data numa folha).
- **Erros de validação de tela:** `Notice tone=danger` no lugar do conteúdo ou acima da lista (ex.: "Adicione pelo menos uma ficha"); na linha do item com problema, detalhe em `status/danger` e borda 2 px `border/danger`. Os botões continuam habilitados; o erro aparece ao tocar em salvar.
- **Listas de pessoas e atalhos (professor):** busca (`SearchField`) abaixo do título e lista de `StudentRow` com 8 de espaço entre linhas, ordem alfabética. A lista rola; o botão principal fica fixo no rodapé. Atalhos de navegação dentro de uma tela usam `SectionRow`.
- **Listas reordenáveis (professor):** `ReorderRow` (alça de arrastar à esquerda, título e detalhe, seta à direita), 8 de espaço entre linhas. Usadas em fichas e em exercícios.
- **Seletor de data:** folha com título "Escolher início", `CalendarHeader`, dias da semana, grade de `MonthDay` e botão "Confirmar início". **Datas passadas ficam desabilitadas** (opacidade 35%); hoje usa `MonthDay state=today, selected=true`.
- **Seções:** rótulo `text/overline` em `text/secondary` acima de cada cartão/lista (ex.: "OUTRAS FICHAS", "MEUS DADOS", "EXERCÍCIOS").
- **Calendário:** dias futuros neutros e sem interação (`state=future`); dia sem registro com ponto neutro; dia feito com marca verde e a letra da ficha. **Calendário do professor**: mesmo componente, só leitura (sem botões de marcar ou desfazer no painel do dia).
- **Páginas de fluxo:** frames clonados, toque = círculo vazado (46) com anel `text/primary` e preenchimento `brand` @24% (para não esconder o texto de botões laranja) + número em círculo laranja (26, **tamanho fixo**, senão o auto layout o encolhe) acima à direita; seta laranja com cabeça `ARROW_LINES`; rótulo laranja curto sobre a seta. Exemplos: "Fluxo · Painel do dia", "Fluxo · Entrada do aluno", "Fluxo · Professor · Alunos", "Fluxo · Professor · Acompanhar" e "Fluxo · Professor · Treino". Cada frame tem abaixo um título (`text/body-strong`) e uma descrição curta (`text/body` secundário). Quando o destino está em outra parte, a seta sai sem frame de destino e o rótulo diz para onde vai. **Ao trocar um frame de um fluxo por uma versão mais alta, mover os toques abaixo do ponto alterado pelo mesmo deslocamento.** **Toques, números, setas e rótulos devem ficar por cima dos frames (mover para o fim da lista de camadas depois de clonar frames novos).** No quadro "Fluxo completo", as telas são miniaturas (frames "Miniatura" com o clone escalado, ex.: 0,4): para atualizar uma tela, trocar o clone dentro da miniatura por um novo clone do original, com o mesmo `rescale`. **Raia nova no quadro:** clonar uma raia existente (o texto do título é o único filho), clonar um nó existente (frame 180 × 460 com "Miniatura", título e subtítulo), trocar a miniatura e os dois textos, e clonar a seta (56 de largura, `y = raia + 231`, `x = nó + 182`). O quadro cresce (`resizeWithoutConstraints`) e os cartões de casos de borda ficam acima das raias novas, que entram abaixo deles. **Cartões de casos de borda:** os já cobertos usam o estilo verde (bordas e selo copiados de um cartão "COBERTO"); copiar fills e strokes de um cartão verde para os que mudarem de status.

## 7. Como montar telas (regras práticas)
1. Sempre criar **instâncias** dos componentes da página Componentes. Só criar frame novo para o que não tem componente.
2. Trocar textos pelo conteúdo real (pt-BR); não mudar estilos de texto nas instâncias.
3. Instâncias em auto layout: largura `FILL` quando o pai tem 350; altura `HUG` quando existir (exceto onde o componente define altura fixa, como Button 52).
4. Cores só de variáveis. Para alfa use os tokens `*-subtle`, `scrim`, `disabled`.
5. Ícones: `Icon/<nome>` 24 px. Ativo/selecionado = `style=filled`. Para trocar o ícone em `IconButton` e `EmptyState`, usar a propriedade `icon`; em `SectionRow`, trocar a instância (`swapComponent`) do ícone do bloco e do ícone da direita.
6. Novo elemento repetido (2+ vezes) → propor novo componente e registrar na Parte 2.
7. Antes de entregar: rodar a verificação de múltiplos de 4 e de valores soltos; ver screenshot.
8. Clonar um variante de dentro de um `COMPONENT_SET` cria o clone na **página**, não no conjunto: depois de `clone()`, usar `set.appendChild(clone)`.
9. Linhas com chips: não usar `layoutWrap` no frame de chips (a altura não é recalculada em instâncias). Planejar a largura para os chips caberem em uma linha.
10. No plugin, valores de variável em `setBoundVariable` são passados como **objeto** (não como id); estilos de efeito com `setEffectStyleIdAsync`; `mainComponent` só por `getMainComponentAsync`.
11. Para trocar o tom de um `Notice`, usar `swapComponent` para a variante (`tone=info|neutral|danger`) e trocar os textos `Título` e `Descrição`. Para trocar o tom de um `Chip`, usar `swapComponent` e **reescrever o texto** (a variante volta ao texto padrão). **O mesmo vale para o `Toast`: ao trocar `tone` (ex.: de error para success), o texto volta ao padrão e precisa ser reescrito.**
12. Textos de nome em componentes: aplicar truncamento (regra de "Textos longos" acima) ao criar componente novo com nome de aluno, treino, ficha ou exercício.

---

# Parte 2 · Viva (catálogo de componentes)

Página **Componentes** do Figma, seções Ícones, Atoms, Molecules, **Entrada (lote 3)** e **Professor (lote 4)**. Última revisão: 27/10/2026 (24ª rodada: sem componentes novos; pop-up, sessão, sair, excluir conta e conta bloqueada usam componentes existentes).

## Ícones
Material Symbols Rounded, 24 px, variantes `style=outline|filled`, cor `color/text/primary` (trocar na instância). Disponíveis: home, calendar_month, trending_up, history, person, chevron_left, chevron_right, check, check_circle, close, edit, fitness_center, bedtime, schedule, keyboard_arrow_down, keyboard_arrow_up, mail, lock, logout, info, warning, undo, swap_horiz, add, remove, search, more_horiz, visibility, visibility_off, arrow_back.

## Atoms
| Componente | Variantes / props | Tamanho | Uso |
|---|---|---|---|
| StatusBar | — | 350×40 | Hora e bateria (só apresentação) |
| HomeIndicator | — | 350×24 | Gesto do sistema, rodapé |
| Divider | — | 318×1 | Divisória (`border/subtle`) |
| SheetHandle | — | 40×4 | Alça das folhas |
| DataChip | texto editável | hug ×32 | Séries, reps, descanso |
| IndexBadge | texto editável | 32×32 | Número do exercício |
| LetterBadge | texto editável | 44×44 | Letra da ficha (fixa, regra 111) |
| LoadValue | texto editável | hug ×32 | Carga + "kg" |
| Logo | — | 32×28 | Símbolo da marca |
| Button | `variant=primary\|secondary\|disabled` | 52 de altura, largura total | primary = único laranja por tela; secondary = contorno; **disabled** (lote 3) = preenchido `surface-raised`, texto `text/disabled`, sem borda ("Solicitação enviada", "Continuar" antes de marcar a confirmação) |
| ButtonCompact | `size=md\|sm` | md 48, sm 32 | "Editar" (md), "Marcar" (sm) |
| Chip | `tone=brand\|info\|success\|neutral\|warning` | hug ×24 | Rótulo em caixa alta. brand = Ficha de hoje / Pediu treino; info = Descanso / Convite pendente; success = Feita hoje / Ativo / **Feita em dd/mm**; neutral = Treino encerrado / Sem treino / Convite expirado / **Aguardando envio**; **warning** (lote 4A) = Quase no fim (fundo `warning-subtle`, texto `status/warning`) |
| DayMark | `state=done\|empty\|today` | 24×24 | done = letra verde, empty = ponto, today = anel laranja |
| IconButton | `size=lg\|sm`, `surface=card\|raised`, `icon` (troca de instância) | 44 / 40 / 32 | Botão só com ícone (voltar, setas, − e +) |
| NavBar | `active=home\|frequency\|progress\|history\|profile` | 362×68 | Menu inferior do aluno; aba ativa = pill `surface-raised` + ícone filled; rótulo `text/nav-label` |

## Molecules
Componentes com **truncamento aplicado em 27/10** (texto `FILL`, `textTruncation=ENDING`, `maxLines`): ReorderRow (título e detalhe, 1 linha), SectionRow (título e detalhe, 1), SheetRow (nome e detalhe, 1), WorkoutRow (nome da ficha e detalhe, 1; a camada `Linha` do nome com o chip passou a `FILL`), ActiveWorkoutCard (nome do treino, 1), TodayCard (nome da ficha, 1; prévia dos exercícios, 2), ExerciseCard (nome do exercício, 2) e StudentRow (nome e detalhe, 1; a camada `Linha` do nome passou a `FILL`).

| Componente | Variantes / props | Tamanho | Uso |
|---|---|---|---|
| WeekDay | `state=default\|today\|future`, `selected=false\|true` | 87×104 (preenche) | Dia na faixa semanal |
| MonthDay | `state=default\|today\|future`, `selected=false\|true` | 45×68 | Dia no calendário mensal (padding vertical 8). Linhas do mês são frames de 7 MonthDay, **não** há componente de semana. `state=default` mostra número e letra da ficha; `state=future` mostra só o número |
| WeekStrip | — | 326×104 | 7 WeekDay |
| CalendarHeader | — | 326×36 | Intervalo da semana (ou mês) + setas |
| WeekCalendar | — | 350×176 | Cartão do calendário semanal |
| ActiveWorkoutCard | — | 350×188 | Treino ativo: fase, semana, barra de progresso, datas. Nome do treino trunca em 1 linha. Para "Treino concluído": trocar o texto da semana e dar largura total (310) ao preenchimento da barra |
| TodayCard | — | 350×298 | "Ficha de hoje" com borda laranja e Button primary |
| WorkoutRow | chip "Próxima" opcional (oculte a camada Chip) | 350×76 | Linha de ficha na home |
| ExerciseCard | observação opcional (ocultar bloco); 3 ou 4 DataChip; botão "Editar carga" (ocultar na ficha só leitura do professor) | 350×321 (213 sem observação) | Exercício na ficha, com carga e Editar. Nome do exercício até 2 linhas; observação quebra linha |
| SheetRow | botão "Marcar" opcional | 350×68 | Linha de ficha nas folhas do dia |
| EmptyState | `icon` (troca de instância) | 350 de largura | Estado vazio com título e descrição (também "Sem conexão" e "Sua conta está bloqueada") |
| FormField | `type=text\|password\|multiline`, `state=empty\|filled\|error` | 350×76 (text/password), 350×100 (com erro), 350×120 (multiline) | Rótulo + entrada. `empty` = placeholder em `text/disabled`; `error` = borda `border/danger` + texto de ajuda "Ajuda" em `text/caption`/`status/danger`. **A entrada de text e password tem padding vertical 0 e conteúdo centralizado na vertical (corrigido em 27/10); a de multiline mantém o texto no topo (padding 16).** `password` tem o ícone de mostrar/ocultar (`Icon/visibility_off`) **na ponta direita** (SPACE_BETWEEN, corrigido em 27/10). Variantes existentes: text (filled, empty, error), password (filled, empty, error), multiline (filled, empty) |
| PhoneField (22ª rodada) | `state=empty\|filled\|error` | 350×76 (350×100 com erro) | Campo de telefone: rótulo ("Telefone (WhatsApp)" ou "Telefone (opcional)"), prefixo `Código do país` ("+55") com seta `keyboard_arrow_down`, divisor 1×24 (`border/default`) e `Número` ("(31) 98765-4321"). Mesmo visual do `FormField`; `error` tem o texto `Ajuda` ("Digite um telefone com DDD, como (31) 91234-5678."). Usado no primeiro acesso (passo 2), Editar dados e Cadastrar aluno |
| Toast | `tone=success\|error` | 350×56 | Aviso. success = círculo verde com check (também "Guardado. Envio quando voltar.", "Registros enviados." e **"Conta excluída."**); **error** (lote 3) = círculo `status/danger` com × (ex.: "E-mail ou senha não conferem."). Mensagem em uma linha. Ao trocar `tone`, reescrever o texto. Não aparece nas telas Perfil, que usam o frame `toast-modelo` |

## Entrada (lote 3)
Seção "Entrada (lote 3)" na página Componentes.

| Componente | Variantes / props | Tamanho | Uso |
|---|---|---|---|
| TextButton | `tone=link\|muted` | hug ×48 (sem padding horizontal) | Botão de texto. link = `text/link` em `status/info` ("Esqueci a senha", "Cancelar solicitação", "Corrigir e-mail", "Criar “…” como novo exercício", **"Falar com o aluno no WhatsApp", "Abrir WhatsApp"**); muted = `text/body-strong` em `text/secondary` ("Já tenho acesso? Entrar", "Exercícios ocultos (3)", "Remover esta ficha"). Em largura FILL fica centralizado |
| Notice | `tone=info\|neutral\|danger` | 350 × hug (≈108–134) | Bloco de aviso com ícone, título (`text/body-strong`) e descrição (`text/body` secundário). info = fundo `info-subtle` (aviso de dados no primeiro acesso; convite que vincula conta; treino agendado; exercício parecido; marcações antigas continuam; pedido aberto; **aviso de início hoje ao alterar o treino agendado**); neutral = `surface` + borda `subtle` (convite válido até, convite expirado, "Sem e-mail? Sem problema", fim do treino, "Só leitura", **pedido de novo treino cancelado, descartar alterações, "Sem conexão"**); danger = `surface` + borda `border/danger` + ícone `warning` (**erros de validação do treino: sem ficha, ficha sem exercício, ficha vazia**) |
| StepIndicator | `step=1\|2` | 350×28 | "PASSO 1 DE 2" (`text/overline`) + 2 barras de 4 px (ativa `bg/brand`, inativa `surface-raised`) |
| CheckboxRow | `checked=false\|true` | 350 × hug | Caixa 24 (desmarcada: borda `border/default` 2 px; marcada: fill `bg/brand` com check `on-brand`) + texto `text/body` multilinha |

## Professor (lote 4)
Seção "Professor (lote 4)" na página Componentes (criada na 4A, ampliada na 4B e 4C).

| Componente | Variantes / props | Tamanho | Uso |
|---|---|---|---|
| SearchField | `state=empty\|filled` | 350×52 | Campo de busca: ícone `search` (secundário) + texto. Fundo `surface`, borda 2 px `border/subtle`, raio `radius/control`, padding vertical 0. empty = "Buscar aluno" em `text/disabled`; filled = texto em `text/primary`. Camada de texto `Texto` editável. Também serve para buscar exercício (trocar o texto) |
| StudentRow | camadas: `Nome` (trunca em 1 linha), `Status` (instância de `Chip`, trocar `tone` e texto), `Solicitação` (instância `Chip tone=brand`, "PEDIU TREINO", **oculta por padrão**; ligar com `visible`), `Detalhe` (texto `text/caption`, trunca em 1 linha) e seta `chevron_right` | 350 × 104 | Linha de aluno na lista: fundo `surface`, raio `radius/tile`, padding 16, sem avatar. `Chips` em uma linha (sem wrap). Status possíveis: ATIVO (success), SEM TREINO (neutral), QUASE NO FIM (warning), CONVITE PENDENTE (info), CONVITE EXPIRADO (neutral), CONVITE RECUSADO (neutral) |
| SectionRow (4B) | camadas: `Ícone` (bloco 44 com instância de ícone, trocar com `swapComponent`), `Título`, `Detalhe` (ambos truncam em 1 linha) e seta à direita (também trocável: `more_horiz`, `undo`…) | 350 × 76 | Linha de atalho com ícone: atalhos da tela do aluno (Calendário, Progressão de carga, Perfil, Histórico de treinos) e resultados da biblioteca de exercícios (ícone `fitness_center`, "⋯" à direita; no ocultos, "desfazer") |
| DataRow (4B) | camadas `Rótulo` (`text/caption` secundário) e `Valor` (`text/body`) | 318 × hug | Par rótulo e valor, em cartão `surface` com padding 20 e espaço 16 (perfil do aluno só leitura, inclusive "Telefone (WhatsApp)") |
| Stepper (4C) | camadas `Nome`, `Menos`, `Valor`, `Mais` | 350 × 76 | Número com − e + (`IconButton size=sm`): "8 semanas", "1 semana" (mínimo, com o − a 35%). Caixa de 52 com borda 2 px `border/subtle` |
| DateField (4C) | camadas `Nome` e `Valor` (+ ícone `calendar_month`) | 350 × 76 | Campo de data que abre o seletor de data: "Hoje · 29/10/2026" ou "03/11/2026". Mesmo visual de `FormField`, padding vertical 0 |
| ReorderRow (4C) | camadas `Alça` (2 barras de 16×2), `Título`, `Detalhe` (ambos truncam em 1 linha) e seta à direita | 350 × 72 | Linha reordenável (arrastar): fichas ("Ficha A · Peito e tríceps", "6 exercícios") e exercícios ("Supino reto", "4 séries · 10 reps · Descanso 90 s"). Fundo `surface`, raio `radius/tile`, padding 16. Com problema: detalhe "Sem exercícios" em `status/danger` e borda 2 px `border/danger` |

## Ainda sem componente (frames compostos por instâncias)
Folhas inferiores (Painel do dia, editar carga, cancelar solicitação, seletor de data, editar exercício, ocultar da busca, remover ficha, cancelar agendamento, descartar alterações, **treino novo, sair do app, excluir minha conta e "Sem conexão"**), cartão do convite (professor + validade), cartões do Perfil (linha de lista, rótulo + valor, com ou sem seta, **linha Telefone (WhatsApp)**, **linha "Excluir minha conta"**), cartão de perfil só leitura (frame de `DataRow`), barra fixa de botão (frame "Barra do botão" 390×100, ou 390×164 com dois botões), botão de voltar (use `IconButton`). Registrar aqui ao criar.

## Limitações conhecidas
- Telas Perfil têm 1445 de altura (cresceram com a linha de telefone) para o conteúdo não passar por baixo do menu.
- Tamanhos antigos 11/14/22 px foram arredondados para 12/16/20.
- TodayCard (298), ExerciseCard (321) e Notice (≈108–134) têm altura vinda do conteúdo.
- O conjunto `Button` quebra em duas linhas no canvas (a variante `disabled` fica na segunda); não afeta as instâncias.
- Telas clonadas de outras páginas (ex.: Home em "Solicitação · …") mantêm o "Botão secundário" original trocado por `variant=disabled`; o botão de "Salvar" do Editar dados ainda é frame, não instância (dívida antiga).
- Páginas `[Backup] …` guardam as telas antes da padronização; podem ser apagadas quando o resultado for aprovado.
- A lista de alunos (`Lista · 1`) tem 1100 de altura para mostrar 6 alunos; na prática a lista rola.
- O toast sobre o botão de voltar (telas do professor) cobre o botão enquanto aparece; é o padrão do toast absoluto no topo. O mesmo vale para o toast sobre a saudação na Home ("Registros enviados.") e sobre o título do Login ("Conta excluída.").
- No seletor de data, o estado "desabilitado" é a opacidade 35% numa instância de `MonthDay state=future`; não há variante própria.
- As telas "Calendário · 4 Ficha (só leitura)" e "Editar treino · 2 Editar ficha" são clones editados da ficha do aluno e da tela "Criar treino · 5 Editar ficha"; o texto dos exercícios foi trocado à mão.
- Frames da seção "5 · Casos de borda (22ª rodada)" em "Professor · Treino" e a tela "Agendamento · 3" são clones editados; alturas ajustadas à mão (940 e 1320).
- Seção "6 · Casos de borda (23ª rodada)" em "Professor · Treino" e seção "3 · Sem internet (23ª rodada)" em "Aluno · Ficha e painel do dia" são clones editados (a Home · 6 Sem conexão tem 1414 de altura; o texto do aviso foi trocado à mão).
- **Seção "7 · Casos de borda (24ª rodada)" em "Professor · Treino" e seção "11 · Casos de borda (24ª rodada)" em "Aluno · Entrada" são clones editados** (o pop-up "Treino novo" é a Home · 1 com a folha de "Cancelar solicitação" copiada e re-textada; "Sair" e "Excluir minha conta" são clones de "Perfil · 4"; "Aluno bloqueado" é clone de "Professor · Acesso bloqueado"; a folha é reposicionada à mão se o texto mudar de altura).
- Truncamento só funciona com o texto em `FILL`; aplicar a cada componente novo e a frames compostos à mão.
- Lembrar: ao trocar `Chip` ou `Toast` de variante, o texto volta ao padrão e precisa ser reescrito.
- Na página "↳ Fluxo · Conta e privacidade" há dois conjuntos de frames sobrepostos (cópia antiga); apagar um deles quando convier.

## Páginas do lote 3 (referência)
- **Entrada do aluno**: Convite (válido, expirado, já usado) · Criar acesso (padrão, preenchido, erro de campo) · Primeiro acesso (1a sem marcar, 1b marcado, 2 perfil com telefone, 3 perfil com erros) · Login (padrão, erro com toast) · Esqueci a senha (pedir e-mail, e-mail enviado, nova senha, senha alterada) · Solicitar novo treino (Home enviada, Sem treino enviada, folha de cancelar, Home cancelada, Sem treino cancelada, **6 sem treino com professor já agendado, sem o link de cancelar**) · **Seção 11 · Casos de borda (24ª rodada)**: Treino novo · 1 Pop-up ao abrir o app · Sessão · 1 Sessão expirada (login) · Conta · 1 Conta excluída (volta ao login) · Conta · 2 Aluno bloqueado · Sessão · 2 Sair (folha) · Conta · 3 Excluir minha conta (folha).
- **Fluxo · Entrada do aluno**: 5 trilhas (A convite e primeiro acesso, B login, C esqueci a senha, D e E solicitação) com 16 toques numerados.
- **Aluno · Ficha e painel do dia**, seção **3 · Sem internet (23ª rodada)**: Ficha · 4 Marcada sem conexão · Ficha · 5 Editar carga sem conexão · Home · 6 Sem conexão · Home · 7 Conexão voltou · Home · 8 Sem conexão e sem treino salvo. Seção **4 · Sem internet · telas que exigem conexão**: Frequência · 2, Progressão · 4, Histórico · 3, Home · 9 Solicitar treino, Perfil · 7 Editar dados, Perfil · 8 Excluir conta sem conexão.
- **Aluno · Abas**, seção 4 · Perfil: Perfil · 1 Principal · 2 Editar dados · 3 Dados atualizados · **4 Excluir minha conta (folha)** · 6 Editar dados com erros. (A antiga "Perfil · 5 Pedido enviado" foi removida em 27/10.)
- **↳ Fluxo · Conta e privacidade**: convite de conta existente → login → vincular → conta vinculada, e Perfil → "Excluir minha conta" → confirmar.

## Páginas do lote 4 (referência)
- **Professor · Alunos** (4A): Lista (1 com alunos, 2 busca com resultado, 3 busca sem resultado, 4 vazia) · Cadastrar (1 padrão e 2 erro de campo, ambos com telefone opcional) · Convite (1 gerado com e-mail, 2 gerado sem e-mail, 3 enviado com aviso) · Aluno (1 convite pendente, 2 convite expirado, 3 corrigir e-mail, 4 já tem conta). (A seção "Exclusão de dados (LGPD)" foi removida em 27/10.)
- **Fluxo · Professor · Alunos** (4A): 5 trilhas (cadastrar e enviar; reenviar; corrigir e-mail; gerar novo convite expirado; buscar) com 11 toques numerados.
- **Professor · Acompanhar** (4B): Aluno (1 resumo, 2 com solicitação, 3 sem treino, **4 pedido cancelado**) · Calendário (1 mês, 2 painel do dia só leitura, 3 treino concluído, 4 ficha só leitura) · Progressão (1 lista, 2 detalhe do exercício) · Histórico · Perfil só leitura (com telefone e "Abrir WhatsApp").
- **Fluxo · Professor · Acompanhar** (4B): 8 trilhas (calendário e painel do dia, progressão, perfil, histórico, solicitação, treino concluído, sem treino, ficha só leitura) com 13 toques numerados.
- **Professor · Treino** (4C): Criar treino (1 dados início hoje, 2 dados início futuro, 3 seletor de data, 4 fichas, 5 editar ficha, 6 editar exercício, 7 salvo ativo hoje, 8 salvo agendado) · Biblioteca (1 busca, 2 exercício parecido, 3 ocultar da busca (com o aviso de que as fichas continuam), 4 exercícios ocultos) · Editar treino (1 fichas, 2 editar ficha, 3 remover ficha) · Aluno (4 com treino agendado, 5 cancelar agendamento) · **Seção 5 · Casos de borda (22ª rodada)**: 9 dados (nome vazio), 10 fichas (sem ficha), 11 ficha sem exercício, 12 editar ficha (sem exercício), 13 editar ficha · descartar, 14 fichas · descartar, Editar treino · 4 descartar, 15 fichas · pedido cancelado, 16 dados (1 semana), Agendamento · 3 (pedido aberto + agendado) · **Seção 6 · Casos de borda (23ª rodada)**: 17 Fichas · textos longos, Lista · 6 Nome longo, Home · 6 Treino e ficha com nome longo · **Seção 7 · Casos de borda (24ª rodada)**: Alterar agendado · 1 Dados (valores atuais), Alterar agendado · 2 Início hoje (ativa na hora).
- **Fluxo · Professor · Treino** (4C): 9 trilhas (criar treino, fichas e exercícios, biblioteca, ocultar, ocultos, salvar hoje, agendar, cancelar agendamento, editar treino ativo) com 15 toques numerados; **trilhas K a O (22ª rodada)**: nome obrigatório, ficha sem exercício, salvar ficha e descartar, pedido cancelado, treino agendado (toques 17 a 23).
