# Handoff · Design system e style guide do Coach In

Nota para começar o trabalho em um chat novo. Leia antes `docs/contexto/contexto-produto.md` (regras de negócio e telas) e `docs/contexto/design.md` (design system e catálogo de componentes, fonte de verdade visual). Este arquivo cobre o que está no Figma, as convenções visuais e as manhas do plugin.

## 1. Onde está tudo

- **Arquivo Figma:** Coach In, chave `IDP8M2IKanbn60dyqmzjh1`.
- **Board FigJam (produto):** "Aplicativo de treinos - MVP", chave `JNuuAUgUlhLvia1HZ5X3xO`, página "Ideias de Feature". Há uma cópia na página "FigJam" do Coach In.
- **Ferramenta:** usar o **Figma Desktop Bridge** (ferramentas `figma-console`, principalmente `figma_execute`, `figma_capture_screenshot`, `figma_take_screenshot`). O usuário pediu isso explicitamente. O Figma MCP oficial tem limite de uso no plano Starter.
- **Idioma:** todo texto do app em **pt-BR**. Não inventar regra de negócio sem confirmar com o usuário (Vinicius).

### Páginas do Coach In
| Página | Conteúdo |
|---|---|
| Brand, Manual de marca, Refs | Identidade, referências visuais (Future Pro, WHOOP etc.) |
| Home do aluno | Home com menu inferior: 1 Ficha de hoje, 2 Descanso, 3 Treino concluído, 4 Sem treino, 5 Seguindo com o mesmo treino |
| Ficha e painel do dia | Ficha (hoje, editar carga, marcada como feita) e Painel do dia (4 variantes) |
| Fluxo · Painel do dia | Fluxo com pontos de toque numerados e setas |
| Abas do aluno | Frequência, Progressão (lista, detalhe, vazio), Histórico (lista, vazio), Perfil (principal, editar, salvo) |
| **Entrada do aluno** | Lote 3: Convite (válido, expirado, já usado), Criar acesso (3 estados), Primeiro acesso (1a, 1b, 2), Login (2), Esqueci a senha (4), Solicitar novo treino (5) |
| **Fluxo · Entrada do aluno** | Fluxo do lote 3: 5 trilhas, 16 toques numerados, setas e rótulos |
| Componentes, Style guide | Design system (variáveis, estilos, componentes). Seção "Entrada (lote 3)" em Componentes |
| FigJam | Cópia do board |
| Arquivo, [Backup] … | Versões antigas |

## 2. Tokens já em uso
Os tokens, a tipografia e as regras de montagem estão **formalizados em `docs/contexto/design.md`** (variáveis `color/…`, `space/…`, `radius/…`, `stroke/…`, estilos `text/…`). Resumo: fundo `#121212`, superfícies `#1E1E1E`/`#2A2A2A`, texto `#E6E6E6`/`#A3A3A3`, laranja `#FF8A3D` (um botão por tela), verde/amarelo/azul semânticos, vermelho **só** erro ou ação destrutiva. Jost Bold nos títulos, Inter no resto. Tela 390, margem 20, cartões 350. Tudo em múltiplos de 4. Tom acolhedor, **nunca culpa**.

## 3. Regras visuais decididas
- **Um único botão laranja por tela.** Ações secundárias em contorno ou texto.
- **Gradiente só em um elemento por tela** (a barra de progresso).
- Dia sem registro: tom suave, texto neutro "Sem registro". Dias futuros: neutros, sem interação.
- Navegação inferior: menu flutuante com 5 abas (Início, Frequência, Progressão, Histórico, Perfil); aba ativa com pílula `#2A2A2A`. **Ficha, detalhe do exercício, Editar dados e as telas de entrada (convite, criar acesso, primeiro acesso, login, esqueci a senha) não mostram o menu.**
- Folhas inferiores (painel do dia, editar carga, cancelar solicitação) sobre fundo escurecido; avisos (toast) escuros, com ícone verde (sucesso) ou vermelho (erro).
- Sem vídeo, GIF ou link de demonstração em nenhum lugar (fora do MVP).

## 4. Componentes
Os componentes oficiais (Atoms, Molecules e "Entrada (lote 3)") estão catalogados na **Parte 2 do `docs/contexto/design.md`**. Ainda são frames compostos por instâncias: folhas inferiores, cartões do Perfil, barra fixa de botão e o cartão do convite. O lote 4 (professor) vai exigir novos componentes; registrar na Parte 2 ao criar.

## 5. Manhas do plugin do Figma (importante)
- `figma_execute` tem **limite de 5 s** por padrão (máximo 30 s via `timeout`); passar `timeout` maior em varreduras grandes (`findAll` em página cheia). Se a execução **falha**, as mudanças dela são **desfeitas por inteiro**; se dá **timeout**, parte pode ter sido aplicada, então conferir antes de repetir.
- Carregar fontes antes de escrever texto (`figma.loadFontAsync`): Jost Bold e Inter Regular/Medium/Semi Bold/Bold. Em notas do FigJam, carregar `node.text.fontName`.
- Com acesso dinâmico a páginas: usar `figma.getNodeByIdAsync` (não `getNodeById`), `figma.setCurrentPageAsync`, `await page.loadAsync()` antes de ler outra página, `node.setTextStyleIdAsync` e `setEffectStyleIdAsync`.
- **`clone()` de uma variante dentro de um componente (COMPONENT_SET) cria o clone na página**, não no conjunto: usar `set.appendChild(clone)` depois. Um conjunto não se redimensiona sozinho depois de mover variantes: chamar `set.resize(...)`.
- Criar conjunto de variantes novo: `figma.combineAsVariants([...componentes], parent)` com nomes `prop=valor, prop=valor`; depois ajustar `layoutSizingVertical='HUG'` nas variantes (a combinação fixa a altura).
- Instâncias: trocar o ícone com `inst.setProperties({'icon#ID': idDoComponenteOutline})`; trocar a variante de um botão com `inst.swapComponent(variante)`; textos de dentro de instâncias podem ser trocados com `node.characters` (fonte carregada).
- **Notas (STICKY) e formas com texto não podem ser clonadas no arquivo de design**; clonar a **seção inteira** que as contém funciona.
- Vetores: usar `setVectorNetworkAsync` (a atribuição direta falha). Setas: `strokeCap: 'ARROW_LINES'` no vértice final. Não retornar `figma.mixed` (`strokeCap`, `strokeWeight`) no resultado do `figma_execute` (erro "Cannot unwrap symbol").
- `layoutPositioning = 'ABSOLUTE'` só vale se o pai tiver auto layout; em frames sem layout, basta definir `x`/`y`.
- Propriedades extras em nós não são permitidas (usar variáveis em closure).
- Captura de tela: escala mínima 0,5. Frames têm `clipsContent`; nós irmãos de um frame não aparecem na captura dele.
- Nós criados caem na página atual: em caso de falha, remover os órfãos antes de refazer.
- Para trocar de arquivo, usar o parâmetro `fileKey` do `figma_execute`.

## 6. Estado do trabalho de telas
- **Feito:** Home do aluno (5 estados), Ficha, Painel do dia (4 variantes + fluxo), abas Frequência, Progressão, Histórico, Perfil (lote 2), **lote 3 (entrada do aluno: convite, criar acesso, primeiro acesso com aviso de LGPD, login, esqueci a senha e solicitar/cancelar novo treino, mais o fluxo)** (26/10).
- **Pendente:** lote 4 (lado do professor). Primeiro decidir a **plataforma** (celular 390 ou web/desktop).
- **A confirmar com o usuário (não são regras):** rótulo "Treino concluído" no lugar de "Semana X de Y" na home "seguindo com o mesmo treino"; onde fica o pedido de exclusão de dados (LGPD; sugestão: bloco Conta); requisitos de senha; validade do link de "Esqueci a senha".
- Numeração: regras até a **53**; rodadas do FigJam até a **14ª**. O lote 4 continua em 54 e na 15ª rodada.

## 7. Prompt sugerido para o chat novo (lote 4)
Ver `docs/contexto/prompts-lotes-3-e-4.md` (prompt do lote 4, professor). O lote 3 já foi feito.
