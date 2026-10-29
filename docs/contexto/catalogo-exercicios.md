# Catálogo Pré-definido de Exercícios — Especificação para o Claude Code

28/10/2026 · Vini

**Estado (28/10/2026):** a migração `20261028103500_exercise_catalog.sql` e os testes estão prontos no branch `fatia-4/catalogo-exercicios` (274 verificações passando no PGlite). **Ainda não foi aplicada** no Supabase: isso espera o item 6 da Fase 0 e o Claude Code.

## 1. Resumo para revisão

O catálogo passa a ter **249 exercícios de musculação** em 15 grupos musculares e 55 equipamentos, entregue como a **migração 0007** do banco, sem editar nenhuma migração já aplicada. Dos 149 exercícios que o banco já tem, 88 mantêm o nome e 61 são renomeados, todos com o mesmo id; 100 entram novos. Preciso que você confirme estes pontos:

- **Escopo:** só musculação, como diz o contexto do produto. Cardio, funcional e mobilidade ficam reservados na seção 6, sem entrar no catálogo.
- **Abordagem A (a que você escolheu):** os 149 exercícios atuais são renomeados para os nomes do catálogo e mantêm o id; os que faltam são inseridos. A correspondência, um por um, está na seção 4.
- **Momento no workflow:** primeira tarefa da fatia 4 (biblioteca e montagem do treino), antes de qualquer tela que leia a biblioteca. O número 0007 é reservado em uma issue agora, e a migração é aplicada depois do item 6 da Fase 0. Detalhes na seção 2.
- **Três grupos novos:** Lombar, Adutores e Abdutores. Hoje o banco tem 12 grupos, e 11 exercícios existentes mudam de grupo (lista na seção 4).
- **Atributos novos por exercício:** se usa carga (sim, opcional, não), se a medida é repetição ou tempo, apelidos para a busca e equipamentos de uma lista fechada.
- **Decisões de produto** (carga “não”, medida em tempo, renomear fichas já montadas) viram regras numeradas a partir da 123, pelo processo de `needs-info` do workflow. Estão na seção 9.
- **Depois da sua aprovação** eu gravo a versão final no repositório em `docs/contexto/catalogo-exercicios.md`, espelho no Project como `claude/catalogo-exercicios.md`, e entrego o JSON e o SQL da migração.

## 2. Momento no workflow do Claude Code

O catálogo entra como a **migração 0007, primeira tarefa da fatia 4** (biblioteca e montagem do treino do professor), antes de qualquer tela que leia a biblioteca. A ordem abaixo segue o ciclo do `docs/WORKFLOW.md`: o repositório é a fonte da verdade, só o Claude Code aplica migrações, nenhuma migração aplicada é editada e um agente aplica por vez.

1. **Agora, sem tocar no código:** abrir uma issue que reserva o número 0007 e anexa este documento (regra do workflow: reservar o número na issue). As decisões da seção 9 viram issues `needs-info` e, respondidas, regras numeradas a partir da 123 (próxima rodada: a 26ª).
2. **Preparar em paralelo:** em um worktree separado, escrever os testes primeiro e depois o SQL da 0007, rodando `node supabase/tests/pglite/run.mjs` até ficar verde. Isso não atrapalha o item em andamento, porque nada é aplicado.
3. **Aplicar:** só depois que o item 6 da Fase 0 (pipeline) estiver verde. Um agente aplica pelo MCP do Supabase e em seguida gera os tipos, confere o Security Advisor, atualiza `docs/schema-coach-in.md`, roda `/code-review` e abre o PR com `/pr`.
4. **Fatia 4:** tickets, checagem no Figma e a tela da biblioteca já lendo o catálogo.

Três motivos para este ponto exato:

- **A busca e o aviso “Já existe um exercício parecido” não podem ser testados sem dados.** A fatia 4 depende do catálogo já carregado.
- **Quanto antes, menos fichas reais mostram o nome antigo.** Os ids não mudam, então treino, ficha e carga continuam apontando para o mesmo exercício (regra 32). O que muda é o nome exibido. Depois da fatia 5, haveria treinos reais com os nomes antigos.
- **O catálogo não depende de nenhuma tela.** Tudo se valida no banco, com testes automáticos, antes de começar a interface.

## 3. Pesquisa e fontes

Usei bases abertas e APIs de exercícios **só para decidir a estrutura** (quais campos existem e como separar músculo de equipamento). **Os nomes dos exercícios foram escritos em pt-BR a partir da prática comum das academias brasileiras**, sem copiar nomes, textos ou mídia dessas bases, e não comparei a lista exercício a exercício com elas. As páginas abaixo foram lidas pelos resultados de busca, não abertas por inteiro.

| Fonte | O que aproveitei |
| --- | --- |
| [exercemus/exercises](https://github.com/exercemus/exercises) | Listas fechadas de categorias, equipamentos e músculos; vários equipamentos por exercício; apelidos ("aliases") por exercício |
| [wger, via scraper no Apify](https://apify.com/crawlerbros/wger-exercise-scraper) | Categorias por região (peito, costas, ombros, braços, pernas, abdômen, panturrilhas), músculo principal e secundário, equipamento como lista própria |
| [maxwu/exercises-dataset](https://github.com/maxwu/exercises-dataset) | Campos de categoria, parte do corpo e equipamento. A mídia (GIFs e imagens) tem direitos de terceiros e não se aplica ao MVP, que não tem vídeo |
| [MuscleWiki API](https://api.musclewiki.com/documentation.md) | Equipamento tratado como categoria de filtro, separado do músculo |
| [RepDB (nível gratuito)](https://github.com/sergei-argutin/exercise-dataset) | Exemplo de catálogo com exercícios, músculos-alvo, equipamento e etiquetas em arquivos JSON |
| [getfitcraft (pt-BR)](https://getfitcraft.com/pt/exercises/muscle/) | Agrupamento por músculo usado em português: peito, costas, ombros, braços, glúteos, quadríceps, posteriores e core |
| [hipertrofia.org](https://hipertrofia.org/blog/page/5) | Nomes em uso no Brasil, como "puxada na polia", "tríceps corda" e "crucifixo invertido" |

O que isso mudou no desenho:

- **Equipamento é uma lista fechada, separada do grupo muscular**, e um exercício pode ter mais de um (por exemplo, barra reta e banco).
- **Apelidos fazem parte do exercício**, porque a academia brasileira mistura termos ("pulley", "puxador", "pulldown" para a mesma puxada).
- **Sem músculo secundário no MVP.** As bases têm, mas a busca do professor (regra 74) só precisa do grupo principal. Dá para acrescentar depois sem mudar o resto.

## 4. Modelo de dados

A migração 0007 **mantém a tabela `exercises`** e a amplia; não cria uma tabela paralela. Os nomes de colunas seguem o banco (inglês); o JSON do catálogo usa português, e o mapeamento é feito na geração do SQL.

| Objeto | O que muda | Observação |
| --- | --- | --- |
| `exercises` (existente) | Novas colunas: `slug` (texto), `aliases` (texto\[\], padrão vazio), `aliases_normalized` (texto), `load_mode` (`required`, `optional`, `none`; padrão `required`), `measure` (`reps`, `time`; padrão `reps`), `catalog_version` (inteiro) | `id`, `owner_id`, `name`, `name_normalized`, `muscle_group` e `created_at` continuam. Predefinido = `owner_id` nulo, como hoje |
| `muscle_groups` (nova) | `name` (chave), `sort_order` | 15 linhas. `exercises.muscle_group` passa a ter chave estrangeira para ela |
| `equipment` (nova) | `slug` (chave), `name`, `category`, `sort_order` | 55 linhas |
| `exercise_equipment` (nova) | `exercise_id`, `equipment_slug`, `position` | Chave (`exercise_id`, `equipment_slug`). Posição 1 é o equipamento principal. `on delete restrict` |
| `exercise_hidden`, `workout_exercises` | Nenhuma | Continuam apontando para o id do exercício |

Mapeamento do JSON para o banco: `usa_carga` sim, opcional, nao → `load_mode` required, optional, none; `medida` repeticoes, tempo → `measure` reps, time; `apelidos` → `aliases`; `grupo` → `muscle_group` (nome do grupo); `equipamentos` → linhas de `exercise_equipment`.

Regras que o Claude Code precisa respeitar:

- **Os 149 exercícios atuais mantêm o id.** A migração localiza cada um pelo nome atual (`name_normalized`, com `owner_id` nulo) e atualiza nome, grupo, slug e atributos. Se algum não for encontrado, a migração para com erro em vez de inserir um duplicado.
- **Os 100 novos** nascem com `gen_random_uuid()`, como já é no seed da 0004. A identidade estável entre ambientes é o `slug`, não o id.
- **Slug** obrigatório e único entre os predefinidos; nulo nos exercícios criados por professor (uma restrição garante as duas coisas). O slug nunca muda depois de publicado. O nome pode ser corrigido por migração nova.
- **Conflito de nome:** antes de renomear, a migração confere se algum exercício de professor já tem o mesmo `name_normalized` de um nome do catálogo. Isso não viola índice nenhum (o único dos pré-definidos é separado do de cada professor), então ela só avisa com um NOTICE e não mexe no exercício do professor, que pode ocultar o dele.
- **Nunca excluído** (regra 31): o gatilho `exercises_no_delete` e o `on delete restrict` continuam. Treino, ficha e carga apontam para o id, nunca para o nome (regra 32).
- **Busca:** o gatilho de normalização existente passa a preencher também `aliases_normalized`, com índice de trigramas nela. `search_exercises` e `similar_exercises` comparam o texto digitado com `name_normalized` e com `aliases_normalized`.
- **`create_exercise`** passa a aceitar `load_mode` e `measure` opcionais (padrão `required` e `reps`) e a validar grupo na lista fechada. Erros novos entram como códigos curtos em `src/lib/erros.ts`.
- **Acesso:** o app só lê tabelas e escreve por RPC. `muscle_groups`, `equipment` e `exercise_equipment` são de leitura para usuários autenticados e sem escrita. Ocultar vale só para quem ocultou e não mexe em fichas já montadas (regras 36 e 113).
- **Documentação:** atualizar `docs/schema-coach-in.md` e gerar os tipos do Supabase na mesma tarefa.

### Correspondência dos 149 exercícios atuais

88 exercícios mantêm o nome e só ganham slug, equipamentos e atributos; eles estão nas tabelas da seção 6. Os 61 abaixo mudam de nome (11 deles também mudam de grupo). Nenhum nome novo colide com outro nome atual.

| Nome atual (0004) | Nome no catálogo | Grupo atual → novo |
| --- | --- | --- |
| Supino no Smith | Supino reto no Smith | Peito |
| Voador (peck deck) | Crucifixo na máquina | Peito |
| Flexão de braço | Flexão de braços | Peito |
| Flexão de braço com joelhos apoiados | Flexão de braços com joelhos apoiados | Peito |
| Puxada frontal na polia alta | Puxada alta aberta | Costas |
| Puxada frontal com pegada supinada | Puxada alta supinada | Costas |
| Puxada com triângulo | Puxada alta com triângulo | Costas |
| Puxada atrás da nuca | Puxada alta atrás da nuca | Costas |
| Puxada articulada na máquina | Puxada na máquina | Costas |
| Pulldown com corda (braço estendido) | Pulldown com braços estendidos | Costas |
| Barra fixa assistida | Barra fixa assistida na máquina | Costas |
| Remada curvada com barra pegada supinada | Remada curvada supinada com barra | Costas |
| Remada unilateral com halter (serrote) | Remada unilateral com halter | Costas |
| Remada baixa na polia com triângulo | Remada baixa com triângulo | Costas |
| Remada baixa na polia com barra reta | Remada baixa com barra reta | Costas |
| Remada na máquina | Remada sentada na máquina | Costas |
| Levantamento terra | Levantamento terra convencional | Costas → Posterior de coxa |
| Hiperextensão lombar no banco romano | Hiperextensão lombar | Costas → Lombar |
| Extensão lombar no solo | Superman | Costas → Lombar |
| Desenvolvimento com barra | Desenvolvimento militar com barra | Ombros |
| Desenvolvimento com halteres | Desenvolvimento com halteres sentado | Ombros |
| Crucifixo inverso com halteres | Crucifixo invertido com halteres | Ombros |
| Crucifixo inverso na máquina | Crucifixo invertido na máquina | Ombros |
| Rosca martelo na corda | Rosca martelo na polia com corda | Bíceps |
| Rosca Scott com barra | Rosca Scott com barra W | Bíceps |
| Rosca Scott com halter | Rosca Scott com halter unilateral | Bíceps |
| Rosca na polia baixa | Rosca direta na polia baixa | Bíceps |
| Rosca na polia alta (duplo bíceps) | Rosca na polia alta | Bíceps |
| Rosca inversa com barra | Rosca inversa com barra W | Bíceps → Antebraço |
| Tríceps pulley com barra reta | Tríceps na polia com barra reta | Tríceps |
| Tríceps pulley com corda | Tríceps na polia com corda | Tríceps |
| Tríceps pulley com barra V | Tríceps na polia com barra V | Tríceps |
| Tríceps pulley invertido (pegada supinada) | Tríceps na polia com pegada supinada | Tríceps |
| Tríceps francês na polia com corda | Tríceps francês na polia | Tríceps |
| Mergulho nas paralelas | Mergulho nas paralelas, foco no tríceps | Tríceps |
| Extensão de punho com barra | Rosca de punho inversa com barra | Antebraço |
| Extensão de punho com halteres | Rosca de punho inversa com halteres | Antebraço |
| Agachamento goblet com halter | Agachamento goblet | Quadríceps |
| Agachamento búlgaro | Agachamento búlgaro com halteres | Quadríceps |
| Agachamento sumô | Agachamento sumô com halter | Quadríceps → Glúteos |
| Afundo com halteres | Avanço com halteres | Quadríceps |
| Afundo com barra | Avanço com barra | Quadríceps |
| Afundo no Smith | Avanço no Smith | Quadríceps |
| Passada (caminhada) com halteres | Avanço caminhando | Quadríceps |
| Avanço | Avanço com peso corporal | Quadríceps |
| Subida no banco (step-up) com halteres | Subida no banco com halteres | Quadríceps → Glúteos |
| Sissy squat | Agachamento sissy | Quadríceps |
| Bom dia (good morning) | Bom dia com barra | Posterior de coxa → Lombar |
| Glúteo na polia (coice) | Coice na polia | Glúteos |
| Glúteo na máquina (coice) | Coice na máquina | Glúteos |
| Abdução de quadril na máquina (cadeira abdutora) | Cadeira abdutora | Glúteos → Abdutores |
| Abdução de quadril na polia | Abdução na polia | Glúteos → Abdutores |
| Adução de quadril na máquina (cadeira adutora) | Cadeira adutora | Glúteos → Adutores |
| Afundo lateral | Avanço lateral | Glúteos → Quadríceps |
| Panturrilha em pé no degrau | Panturrilha em pé com peso corporal | Panturrilha |
| Abdominal supra no solo | Abdominal reto no solo | Abdômen |
| Abdominal na polia com corda | Abdominal na polia | Abdômen |
| Abdominal oblíquo | Abdominal oblíquo no solo | Abdômen |
| Abdominal canivete | Abdominal remador | Abdômen |
| Roda abdominal | Abdominal com roda | Abdômen |
| Rotação russa (russian twist) | Rotação russa | Abdômen |

Nove exercícios atuais não tinham equivalente no rascunho inicial de 240 e foram acrescentados ao catálogo para nenhum ficar órfão (por exemplo Rosca 21 e Agachamento na máquina). Por isso o total é 249, e não 240.

## 5. Listas fechadas e convenções

**Grupos musculares (15).** O grupo é o músculo principal do exercício, um por exercício.

| Grupo | Exercícios |
| --- | --- |
| Peito | 32 |
| Costas | 30 |
| Ombros | 30 |
| Bíceps | 19 |
| Tríceps | 20 |
| Antebraço | 8 |
| Abdômen | 25 |
| Lombar | 6 |
| Glúteos | 15 |
| Quadríceps | 27 |
| Posterior de coxa | 14 |
| Adutores | 4 |
| Abdutores | 6 |
| Panturrilha | 7 |
| Trapézio | 6 |

**Equipamentos (55).** Pensados para o que existe em academia pequena (halteres, barras, banco, polia, Smith) e em academia grande (máquinas articuladas). Os bancos são separados porque nem toda academia tem banco ajustável ou declinado.

| Categoria | Equipamentos |
| --- | --- |
| Peso livre | Barra reta, Barra W, Barra hexagonal, Halteres, Kettlebell, Anilha, Caneleira |
| Bancos e estruturas | Banco reto, Banco ajustável, Banco declinado, Banco Scott, Banco de hiperextensão, Cadeira romana, Rack de agachamento, Smith, Paralelas, Barra fixa, Step ou caixa, Landmine |
| Polia | Polia (cabos) |
| Máquinas | Supino (máquina), Supino inclinado (máquina), Voador, Puxada (máquina), Remada (máquina), Remada cavalinho, Pullover (máquina), Barra assistida (Graviton), Desenvolvimento (máquina), Elevação lateral (máquina), Rosca (máquina), Tríceps (máquina), Abdominal (máquina), Rotação de tronco (máquina), Lombar (máquina), Leg press 45°, Leg press horizontal, Hack, Pêndulo, Cadeira extensora, Mesa flexora, Cadeira flexora, Flexora em pé, Cadeira adutora, Cadeira abdutora, Glúteo (máquina), Elevação pélvica (máquina), Panturrilha em pé (máquina), Panturrilha sentado (máquina), Encolhimento (máquina) |
| Acessórios | Elástico, Bola suíça, Suspensão (TRX), Roda abdominal |
| Sem equipamento | Peso corporal |

**Carga e medida.** Dois atributos que mudam o que a ficha mostra:

| Atributo | Valor | Quantos | Significado |
| --- | --- | --- | --- |
| usa\_carga | sim | 195 | A ficha mostra a carga editável (regras 26 a 29) |
| usa\_carga | opcional | 16 | Dá para somar lastro ou usar assistência (barra fixa, paralelas, mergulho) |
| usa\_carga | nao | 38 | Só peso corporal (flexão, prancha, ponte); a ficha não pede carga |
| medida | repeticoes | 244 | O campo de repetições é um número |
| medida | tempo | 5 | Prancha frontal, prancha lateral, hollow hold, pendurado na barra fixa e agachamento isométrico na parede |

**Convenções de nome**, para o catálogo e para o aviso de duplicado:

- **Nome = movimento + variação + implemento**, como em "Supino inclinado com halteres".
- **Uma entrada por variação que muda o estímulo ou o equipamento.** Diferença só de pegada ou de largura não vira exercício novo; quem quiser descreve na observação do exercício (regra do contexto do produto).
- **Termos em inglês e jargão de academia entram como apelido**, não como nome.
- **Sem marca nem modelo de máquina.**
- **Onde classificar na dúvida:** levantamento terra em Posterior de coxa; remada alta e elevação em Y em Ombros; mergulho nas paralelas aparece uma vez em Peito e outra em Tríceps, com o foco no nome.

## 6. Catálogo de exercícios

São 249 exercícios, por grupo muscular. A coluna "Também buscado como" lista os apelidos que a busca aceita; 123 exercícios têm apelidos. Em "Equipamento", o primeiro é o principal.

### Peito (32)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Supino reto com barra | Barra reta + Banco reto | Sim | Reps | Supino, Supino reto, Bench press |
| Supino inclinado com barra | Barra reta + Banco ajustável | Sim | Reps | Supino inclinado |
| Supino declinado com barra | Barra reta + Banco declinado | Sim | Reps | Supino declinado |
| Supino reto com halteres | Halteres + Banco reto | Sim | Reps | Supino com halteres |
| Supino inclinado com halteres | Halteres + Banco ajustável | Sim | Reps |  |
| Supino declinado com halteres | Halteres + Banco declinado | Sim | Reps |  |
| Supino reto com halteres, pegada neutra | Halteres + Banco reto | Sim | Reps |  |
| Supino reto no Smith | Smith + Banco reto | Sim | Reps |  |
| Supino inclinado no Smith | Smith + Banco ajustável | Sim | Reps |  |
| Supino reto na máquina | Supino (máquina) | Sim | Reps | Chest press, Supino articulado |
| Supino inclinado na máquina | Supino inclinado (máquina) | Sim | Reps |  |
| Supino na polia em pé | Polia (cabos) | Sim | Reps |  |
| Supino no chão com halteres | Halteres | Sim | Reps | Floor press |
| Crucifixo reto com halteres | Halteres + Banco reto | Sim | Reps | Crucifixo |
| Crucifixo inclinado com halteres | Halteres + Banco ajustável | Sim | Reps |  |
| Crucifixo declinado com halteres | Halteres + Banco declinado | Sim | Reps |  |
| Crucifixo na máquina | Voador | Sim | Reps | Voador, Peck deck, Peitoral na máquina |
| Crucifixo reto na polia | Polia (cabos) + Banco reto | Sim | Reps |  |
| Crucifixo inclinado na polia | Polia (cabos) + Banco ajustável | Sim | Reps |  |
| Crossover na polia alta | Polia (cabos) | Sim | Reps | Cross over, Cabo cruzado |
| Crossover na polia média | Polia (cabos) | Sim | Reps |  |
| Crossover na polia baixa | Polia (cabos) | Sim | Reps |  |
| Crossover unilateral na polia | Polia (cabos) | Sim | Reps |  |
| Crucifixo com elástico | Elástico | Sim | Reps |  |
| Pullover com halter | Halteres + Banco reto | Sim | Reps | Pull-over |
| Svend press | Anilha | Sim | Reps | Press com anilha |
| Flexão de braços | Peso corporal | Não | Reps | Flexão, Flexão no chão |
| Flexão de braços com joelhos apoiados | Peso corporal | Não | Reps |  |
| Flexão de braços inclinada, mãos elevadas | Peso corporal + Banco reto | Não | Reps |  |
| Flexão de braços declinada, pés elevados | Peso corporal + Banco reto | Não | Reps |  |
| Flexão de braços no TRX | Suspensão (TRX) | Não | Reps |  |
| Mergulho nas paralelas, foco no peito | Paralelas | Opcional | Reps | Paralelas, Dips |

### Costas (30)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Puxada alta aberta | Polia (cabos) | Sim | Reps | Pulley, Puxador frente, Puxada frontal, Pulldown, Lat pulldown |
| Puxada alta supinada | Polia (cabos) | Sim | Reps | Puxada fechada supinada |
| Puxada alta com triângulo | Polia (cabos) | Sim | Reps | Puxada neutra, Puxada fechada |
| Puxada alta atrás da nuca | Polia (cabos) | Sim | Reps | Pulley atrás |
| Puxada alta unilateral | Polia (cabos) | Sim | Reps |  |
| Puxada na máquina | Puxada (máquina) | Sim | Reps | Puxada articulada |
| Pulldown com braços estendidos | Polia (cabos) | Sim | Reps | Pullover na polia |
| Barra fixa pronada | Barra fixa | Opcional | Reps | Barra fixa, Pull-up |
| Barra fixa supinada | Barra fixa | Opcional | Reps | Chin-up |
| Barra fixa com pegada neutra | Barra fixa | Opcional | Reps |  |
| Barra fixa assistida na máquina | Barra assistida (Graviton) | Sim | Reps | Graviton |
| Barra fixa com elástico | Barra fixa + Elástico | Não | Reps |  |
| Remada curvada com barra | Barra reta | Sim | Reps | Remada curvada |
| Remada curvada supinada com barra | Barra reta | Sim | Reps |  |
| Remada Pendlay | Barra reta | Sim | Reps |  |
| Remada curvada com halteres | Halteres | Sim | Reps |  |
| Remada unilateral com halter | Halteres + Banco reto | Sim | Reps | Serrote, Remada serrote |
| Remada com apoio no banco inclinado | Halteres + Banco ajustável | Sim | Reps | Remada com peito apoiado |
| Remada cavalinho | Remada cavalinho | Sim | Reps | Remada T, T-bar |
| Remada com landmine | Landmine | Sim | Reps |  |
| Remada baixa com triângulo | Polia (cabos) | Sim | Reps | Remada sentada, Remada baixa |
| Remada baixa com barra reta | Polia (cabos) | Sim | Reps |  |
| Remada baixa com pegada aberta | Polia (cabos) | Sim | Reps |  |
| Remada unilateral na polia | Polia (cabos) | Sim | Reps |  |
| Remada sentada na máquina | Remada (máquina) | Sim | Reps | Remada articulada |
| Remada no Smith | Smith | Sim | Reps |  |
| Remada invertida no Smith | Smith | Não | Reps | Remada invertida, Remada australiana |
| Remada invertida no TRX | Suspensão (TRX) | Não | Reps |  |
| Pullover na máquina | Pullover (máquina) | Sim | Reps |  |
| Remada articulada na máquina | Remada (máquina) | Sim | Reps |  |

### Ombros (30)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Desenvolvimento militar com barra | Barra reta | Sim | Reps | Desenvolvimento em pé, Military press |
| Desenvolvimento com barra sentado | Barra reta + Banco ajustável | Sim | Reps |  |
| Desenvolvimento com halteres sentado | Halteres + Banco ajustável | Sim | Reps |  |
| Desenvolvimento com halteres em pé | Halteres | Sim | Reps |  |
| Desenvolvimento Arnold | Halteres + Banco ajustável | Sim | Reps | Arnold press |
| Desenvolvimento no Smith | Smith + Banco ajustável | Sim | Reps |  |
| Desenvolvimento na máquina | Desenvolvimento (máquina) | Sim | Reps | Desenvolvimento articulado |
| Desenvolvimento unilateral com landmine | Landmine | Sim | Reps |  |
| Desenvolvimento com kettlebell | Kettlebell | Sim | Reps |  |
| Flexão pike | Peso corporal | Não | Reps |  |
| Elevação lateral com halteres | Halteres | Sim | Reps | Elevação lateral |
| Elevação lateral sentado com halteres | Halteres + Banco ajustável | Sim | Reps |  |
| Elevação lateral na polia | Polia (cabos) | Sim | Reps |  |
| Elevação lateral na máquina | Elevação lateral (máquina) | Sim | Reps |  |
| Elevação lateral com elástico | Elástico | Sim | Reps |  |
| Elevação frontal com halteres | Halteres | Sim | Reps | Elevação frontal |
| Elevação frontal com barra | Barra reta | Sim | Reps |  |
| Elevação frontal com anilha | Anilha | Sim | Reps |  |
| Elevação frontal na polia | Polia (cabos) | Sim | Reps |  |
| Crucifixo invertido com halteres | Halteres | Sim | Reps | Posterior de ombro |
| Crucifixo invertido no banco inclinado | Halteres + Banco ajustável | Sim | Reps |  |
| Crucifixo invertido na máquina | Voador | Sim | Reps | Voador invertido |
| Crucifixo invertido na polia | Polia (cabos) | Sim | Reps |  |
| Face pull | Polia (cabos) | Sim | Reps | Puxada para o rosto |
| Remada alta com barra | Barra reta | Sim | Reps | Remada alta |
| Remada alta com halteres | Halteres | Sim | Reps |  |
| Remada alta na polia | Polia (cabos) | Sim | Reps |  |
| Rotação externa na polia | Polia (cabos) | Sim | Reps | Manguito rotador |
| Rotação externa com halter deitado de lado | Halteres + Banco reto | Sim | Reps | Manguito rotador |
| Elevação em Y no banco inclinado | Halteres + Banco ajustável | Sim | Reps |  |

### Bíceps (19)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Rosca direta com barra reta | Barra reta | Sim | Reps | Rosca direta |
| Rosca direta com barra W | Barra W | Sim | Reps | Rosca W |
| Rosca direta na polia baixa | Polia (cabos) | Sim | Reps |  |
| Rosca alternada com halteres | Halteres | Sim | Reps | Rosca alternada |
| Rosca simultânea com halteres | Halteres | Sim | Reps |  |
| Rosca martelo com halteres | Halteres | Sim | Reps | Rosca martelo |
| Rosca martelo cruzada | Halteres | Sim | Reps | Rosca cross body |
| Rosca martelo na polia com corda | Polia (cabos) | Sim | Reps |  |
| Rosca concentrada | Halteres + Banco reto | Sim | Reps |  |
| Rosca Scott com barra W | Barra W + Banco Scott | Sim | Reps | Rosca Scott |
| Rosca Scott com halter unilateral | Halteres + Banco Scott | Sim | Reps |  |
| Rosca Scott na máquina | Rosca (máquina) | Sim | Reps |  |
| Rosca inclinada com halteres | Halteres + Banco ajustável | Sim | Reps |  |
| Rosca Spider | Barra W + Banco ajustável | Sim | Reps |  |
| Rosca na polia alta | Polia (cabos) | Sim | Reps | Rosca duplo bíceps |
| Rosca unilateral na polia | Polia (cabos) | Sim | Reps |  |
| Rosca Zottman | Halteres | Sim | Reps |  |
| Rosca com elástico | Elástico | Sim | Reps |  |
| Rosca 21 | Barra reta | Sim | Reps |  |

### Tríceps (20)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Tríceps na polia com barra reta | Polia (cabos) | Sim | Reps | Tríceps pulley, Pushdown |
| Tríceps na polia com corda | Polia (cabos) | Sim | Reps | Tríceps corda |
| Tríceps na polia com barra V | Polia (cabos) | Sim | Reps |  |
| Tríceps unilateral na polia | Polia (cabos) | Sim | Reps |  |
| Tríceps testa com barra W | Barra W + Banco reto | Sim | Reps | Tríceps testa, Skullcrusher |
| Tríceps testa com halteres | Halteres + Banco reto | Sim | Reps |  |
| Tríceps testa na polia | Polia (cabos) + Banco reto | Sim | Reps |  |
| Tríceps francês com halter | Halteres | Sim | Reps | Tríceps francês |
| Tríceps francês unilateral com halter | Halteres | Sim | Reps |  |
| Tríceps francês na polia | Polia (cabos) | Sim | Reps | Tríceps corda atrás da cabeça |
| Tríceps coice com halter | Halteres + Banco reto | Sim | Reps | Tríceps coice, Kickback |
| Tríceps coice na polia | Polia (cabos) | Sim | Reps |  |
| Tríceps na máquina | Tríceps (máquina) | Sim | Reps | Mergulho na máquina |
| Supino fechado com barra | Barra reta + Banco reto | Sim | Reps | Supino pegada fechada |
| Supino fechado no Smith | Smith + Banco reto | Sim | Reps |  |
| Mergulho no banco | Banco reto | Opcional | Reps | Tríceps banco |
| Mergulho nas paralelas, foco no tríceps | Paralelas | Opcional | Reps | Paralelas, Dips |
| Flexão diamante | Peso corporal | Não | Reps | Flexão fechada |
| Tríceps com elástico | Elástico | Sim | Reps |  |
| Tríceps na polia com pegada supinada | Polia (cabos) | Sim | Reps | Tríceps pulley invertido |

### Antebraço (8)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Rosca de punho com barra | Barra reta + Banco reto | Sim | Reps | Rosca punho |
| Rosca de punho com halteres | Halteres + Banco reto | Sim | Reps |  |
| Rosca de punho inversa com barra | Barra reta + Banco reto | Sim | Reps | Extensão de punho |
| Rosca inversa com barra W | Barra W | Sim | Reps |  |
| Rosca inversa na polia | Polia (cabos) | Sim | Reps |  |
| Pronação e supinação com halter | Halteres | Sim | Reps |  |
| Pendurado na barra fixa | Barra fixa | Não | Tempo | Dead hang, Pegada na barra |
| Rosca de punho inversa com halteres | Halteres + Banco reto | Sim | Reps | Extensão de punho |

### Abdômen (25)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Abdominal reto no solo | Peso corporal | Não | Reps | Abdominal, Abdominal supra, Crunch |
| Abdominal com anilha | Anilha | Sim | Reps |  |
| Abdominal na máquina | Abdominal (máquina) | Sim | Reps |  |
| Abdominal na polia | Polia (cabos) | Sim | Reps | Abdominal corda, Crunch na polia |
| Abdominal declinado | Banco declinado | Opcional | Reps |  |
| Abdominal na bola suíça | Bola suíça | Não | Reps |  |
| Abdominal infra no solo | Peso corporal | Não | Reps | Elevação de pernas deitado |
| Elevação de pernas na barra fixa | Barra fixa | Não | Reps |  |
| Elevação de joelhos na barra fixa | Barra fixa | Não | Reps |  |
| Elevação de pernas na cadeira romana | Cadeira romana | Não | Reps | Cadeira capitão |
| Elevação de joelhos na cadeira romana | Cadeira romana | Não | Reps | Cadeira capitão |
| Abdominal remador | Peso corporal | Não | Reps | Canivete |
| Abdominal bicicleta | Peso corporal | Não | Reps |  |
| Abdominal oblíquo no solo | Peso corporal | Não | Reps | Crunch lateral |
| Lenhador na polia | Polia (cabos) | Sim | Reps | Woodchopper, Rotação na polia |
| Rotação russa | Peso corporal | Opcional | Reps | Russian twist |
| Rotação de tronco na máquina | Rotação de tronco (máquina) | Sim | Reps |  |
| Pallof press | Polia (cabos) | Sim | Reps | Antirrotação |
| Flexão lateral de tronco com halter | Halteres | Sim | Reps | Inclinação lateral |
| Abdominal com roda | Roda abdominal | Não | Reps | Roda abdominal |
| Prancha frontal | Peso corporal | Não | Tempo | Prancha |
| Prancha lateral | Peso corporal | Não | Tempo |  |
| Hollow hold | Peso corporal | Não | Tempo | Barquinho |
| Dead bug | Peso corporal | Não | Reps |  |
| Elevação de pernas no banco | Banco reto | Não | Reps |  |

### Lombar (6)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Hiperextensão lombar | Banco de hiperextensão | Opcional | Reps | Extensão lombar, Banco romano |
| Extensão lombar na máquina | Lombar (máquina) | Sim | Reps | Cadeira lombar |
| Extensão lombar na bola suíça | Bola suíça | Não | Reps |  |
| Superman | Peso corporal | Não | Reps |  |
| Bird dog | Peso corporal | Não | Reps | Cachorro e pássaro |
| Bom dia com barra | Barra reta + Rack de agachamento | Sim | Reps | Good morning |

### Glúteos (15)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Elevação pélvica com barra | Barra reta + Banco reto | Sim | Reps | Hip thrust |
| Elevação pélvica no Smith | Smith + Banco reto | Sim | Reps | Hip thrust no Smith |
| Elevação pélvica na máquina | Elevação pélvica (máquina) | Sim | Reps |  |
| Elevação pélvica com halter | Halteres + Banco reto | Sim | Reps |  |
| Elevação pélvica unilateral | Peso corporal + Banco reto | Opcional | Reps |  |
| Ponte de glúteos | Peso corporal | Não | Reps | Glute bridge |
| Ponte de glúteos unilateral | Peso corporal | Não | Reps |  |
| Coice na polia | Polia (cabos) | Sim | Reps | Glúteo na polia, Kickback na polia |
| Coice na máquina | Glúteo (máquina) | Sim | Reps | Glúteo na máquina |
| Coice com caneleira | Caneleira | Sim | Reps | Quatro apoios |
| Coice no Smith | Smith | Sim | Reps |  |
| Extensão de quadril em pé na polia | Polia (cabos) | Sim | Reps |  |
| Agachamento sumô com halter | Halteres | Sim | Reps | Sumô |
| Subida no banco com halteres | Halteres + Step ou caixa | Sim | Reps | Step-up |
| Extensão de quadril no banco 45° | Banco de hiperextensão | Opcional | Reps |  |

### Quadríceps (27)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Agachamento livre com barra | Barra reta + Rack de agachamento | Sim | Reps | Agachamento, Agachamento livre, Back squat |
| Agachamento frontal com barra | Barra reta + Rack de agachamento | Sim | Reps | Front squat |
| Agachamento no Smith | Smith | Sim | Reps | Agachamento guiado |
| Agachamento hack | Hack | Sim | Reps | Hack |
| Agachamento pêndulo | Pêndulo | Sim | Reps | Pêndulo |
| Leg press 45° | Leg press 45° | Sim | Reps | Leg press, Leg 45 |
| Leg press horizontal | Leg press horizontal | Sim | Reps |  |
| Leg press unilateral | Leg press 45° | Sim | Reps |  |
| Cadeira extensora | Cadeira extensora | Sim | Reps | Extensora |
| Cadeira extensora unilateral | Cadeira extensora | Sim | Reps |  |
| Agachamento goblet | Kettlebell | Sim | Reps | Goblet squat |
| Agachamento com halteres | Halteres | Sim | Reps |  |
| Agachamento búlgaro com halteres | Halteres + Banco reto | Sim | Reps | Búlgaro |
| Agachamento búlgaro no Smith | Smith + Banco reto | Sim | Reps |  |
| Afundo estático com halteres | Halteres | Sim | Reps | Agachamento afundo, Split squat |
| Avanço com halteres | Halteres | Sim | Reps | Passada, Avanço |
| Avanço com barra | Barra reta | Sim | Reps |  |
| Avanço no Smith | Smith | Sim | Reps |  |
| Avanço caminhando | Halteres | Sim | Reps | Passada caminhando |
| Avanço reverso | Halteres | Sim | Reps | Passada para trás, Recuo |
| Avanço lateral | Halteres | Sim | Reps |  |
| Agachamento livre com peso corporal | Peso corporal | Opcional | Reps | Agachamento sem peso |
| Agachamento sissy | Peso corporal | Não | Reps |  |
| Agachamento pistola | Peso corporal | Opcional | Reps | Pistol squat |
| Agachamento isométrico na parede | Peso corporal | Não | Tempo | Cadeirinha |
| Agachamento na máquina | Hack | Sim | Reps |  |
| Avanço com peso corporal | Peso corporal | Opcional | Reps | Avanço |

### Posterior de coxa (14)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Mesa flexora | Mesa flexora | Sim | Reps | Flexora deitada, Flexora |
| Cadeira flexora | Cadeira flexora | Sim | Reps | Flexora sentada |
| Flexora em pé | Flexora em pé | Sim | Reps | Flexora unilateral em pé |
| Flexora na polia | Polia (cabos) | Sim | Reps |  |
| Flexora com bola suíça | Bola suíça | Não | Reps |  |
| Flexão nórdica | Peso corporal | Não | Reps | Nordic curl |
| Stiff com barra | Barra reta | Sim | Reps | Stiff |
| Stiff com halteres | Halteres | Sim | Reps |  |
| Stiff no Smith | Smith | Sim | Reps |  |
| Stiff unilateral com halter | Halteres | Sim | Reps |  |
| Levantamento terra romeno | Barra reta | Sim | Reps | RDL, Terra romeno |
| Levantamento terra convencional | Barra reta | Sim | Reps | Levantamento terra, Terra, Deadlift |
| Levantamento terra sumô | Barra reta | Sim | Reps | Terra sumô |
| Levantamento terra com barra hexagonal | Barra hexagonal | Sim | Reps | Terra com barra hex |

### Adutores (4)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Cadeira adutora | Cadeira adutora | Sim | Reps | Adutora |
| Adução na polia | Polia (cabos) | Sim | Reps |  |
| Adução deitado de lado | Peso corporal | Opcional | Reps |  |
| Adução com bola entre os joelhos | Bola suíça | Não | Reps |  |

### Abdutores (6)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Cadeira abdutora | Cadeira abdutora | Sim | Reps | Abdutora |
| Abdução na polia | Polia (cabos) | Sim | Reps |  |
| Abdução deitado de lado com caneleira | Caneleira | Sim | Reps |  |
| Abdução em pé com elástico | Elástico | Sim | Reps |  |
| Caminhada lateral com elástico | Elástico | Sim | Reps | Monster walk |
| Concha com elástico | Elástico | Sim | Reps | Clamshell |

### Panturrilha (7)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Panturrilha em pé na máquina | Panturrilha em pé (máquina) | Sim | Reps | Gêmeos em pé |
| Panturrilha sentado na máquina | Panturrilha sentado (máquina) | Sim | Reps | Gêmeos sentado, Sóleo |
| Panturrilha no leg press | Leg press 45° | Sim | Reps |  |
| Panturrilha no Smith | Smith + Step ou caixa | Sim | Reps |  |
| Panturrilha unilateral com halter | Halteres + Step ou caixa | Sim | Reps |  |
| Panturrilha em pé com peso corporal | Peso corporal + Step ou caixa | Opcional | Reps |  |
| Elevação de pontas dos pés | Peso corporal | Não | Reps | Tibial anterior, Tibial |

### Trapézio (6)

| Exercício | Equipamento | Carga | Medida | Também buscado como |
| --- | --- | --- | --- | --- |
| Encolhimento com barra | Barra reta | Sim | Reps | Encolhimento, Shrug |
| Encolhimento com halteres | Halteres | Sim | Reps |  |
| Encolhimento no Smith | Smith | Sim | Reps |  |
| Encolhimento com barra hexagonal | Barra hexagonal | Sim | Reps |  |
| Encolhimento na polia | Polia (cabos) | Sim | Reps |  |
| Encolhimento na máquina | Encolhimento (máquina) | Sim | Reps |  |

### Reservado para depois do MVP (não entra no seed)

O contexto do produto deixa cardio e funcional fora do MVP. Ficam anotados para uma segunda versão do catálogo, para que a estrutura (grupo, equipamento, medida em tempo) já comporte esses exercícios.

| Bloco | Exemplos |
| --- | --- |
| Cardio | Esteira, bicicleta ergométrica, elíptico, remo ergométrico, simulador de escada, air bike, pular corda |
| Funcional e corpo inteiro | Burpee, kettlebell swing, thruster, Turkish get-up, slam ball, corda naval, empurrar trenó, caminhada do fazendeiro, arremesso e arranco |
| Mobilidade e alongamento | Alongamentos por grupo muscular, mobilidade de quadril e de ombro, liberação com rolo de espuma |

## 7. Exercícios criados pelo professor

O professor só cria exercício depois de buscar, e o que ele cria fica privado dele. O catálogo existe para que isso seja a exceção (regras 30, 32 e 74).

- **Busca primeiro.** A busca olha o catálogo e os exercícios do próprio professor, pelo nome e pelos apelidos, sem diferenciar acento nem maiúscula.
- **Sem resultado:** a opção "Criar “texto” como novo exercício".
- **Aviso de parecido.** Ao digitar um nome parecido com um existente, aparece "Já existe um exercício parecido", com "Usar o existente" (principal) e "Criar mesmo assim".
- **Campos ao criar (proposta):** nome e grupo muscular obrigatórios; equipamento opcional, escolhido na lista fechada; carga e medida com o padrão "sim" e "repetições", ajustáveis.
- **Dono:** owner\_id = professor autor. O slug fica vazio, porque só o catálogo tem slug.
- **Privado** de quem criou (regra 36). **Nunca excluído** (regra 31). Se virar duplicado, o professor **oculta da busca** e a ficha que já usa continua funcionando (regras 32 e 113). **Mesclar fica para depois.**
- **Crescimento do catálogo.** Não há promoção automática de exercício criado para o catálogo. Quando você quiser uma versão nova, dá para consultar no banco quais nomes se repetem entre professores e decidir o que entra. No MVP isso não precisa de tela.

## 8. Instruções para o Claude Code

A entrega tem dois arquivos: o JSON do catálogo, que é a fonte dos dados, e a migração 0007, gerada a partir dele. Depois da aprovação eu entrego os dois; o Claude Code revisa o SQL e o adapta ao padrão das migrações do projeto, mas não precisa escrever nem alterar exercícios. Caminho sugerido para o JSON: `docs/contexto/exercicios.catalogo.json`. Formato:

```json
{
  "versao": 1,
  "grupos_musculares": [{ "slug": "peito", "nome": "Peito", "ordem": 1 }],
  "equipamentos": [{ "slug": "barra_reta", "nome": "Barra reta", "categoria": "Peso livre", "ordem": 1 }],
  "exercicios": [
    {
      "slug": "supino-reto-com-barra",
      "nome": "Supino reto com barra",
      "grupo": "peito",
      "equipamentos": ["barra_reta", "banco_reto"],
      "usa_carga": "sim",
      "medida": "repeticoes",
      "apelidos": ["Supino", "Supino reto", "Bench press"]
    }
  ]
}
```

Passos, no ciclo do `docs/WORKFLOW.md`:

1. Issue que reserva o número 0007, com este documento e o JSON anexos. Decisões de produto pendentes (seção 9) ficam como `needs-info`.
2. **Testes primeiro** (lista abaixo), no `supabase/tests/pglite`. Procurar também os testes de `supabase/tests/10_tests.sql` que assumem 149 exercícios predefinidos ou os nomes antigos, e ajustá-los.
3. **Migração nova 0007**, sem tocar na 0004 nem em outra aplicada, nesta ordem: colunas e tabelas da seção 4 → grupos e equipamentos → `UPDATE` dos 149 pelo nome atual, com a tabela de correspondência → `INSERT` dos 100 novos → `exercise_equipment` → restrições (slug, chave estrangeira do grupo) → gatilho de normalização e índice dos apelidos → `create or replace` de `search_exercises`, `similar_exercises` e `create_exercise`.
4. `node supabase/tests/pglite/run.mjs` verde.
5. Só então aplicar pelo MCP do Supabase, depois do item 6 da Fase 0 e com um agente por vez. Em seguida: gerar tipos, Security Advisor, atualizar `docs/schema-coach-in.md`, `/code-review` e `/pr`.
6. Somente depois, a tela da biblioteca da fatia 4.

Testes que precisam existir:

- O JSON é validado pelo gerador do SQL (slugs e nomes únicos, grupo e equipamento citados existem, carga e medida válidas, nenhum apelido igual ao nome de outro exercício). No banco, as restrições de slug, grupo, carga e medida são testadas.
- Depois da migração: 249 predefinidos, 15 grupos e 55 equipamentos; todo predefinido tem slug e nenhum exercício de professor tem.
- Os 149 ids antigos continuam existindo com os nomes novos (por exemplo, o id que era “Voador (peck deck)” agora é “Crucifixo na máquina”), e um `workout_exercises` criado antes da migração continua válido.
- Nenhum par de predefinidos com o mesmo `name_normalized`.
- Um `DELETE` em exercício falha.
- O professor A lê todo o catálogo e não lê exercício criado pelo professor B. O professor não altera linha do catálogo.
- A busca por “pulley”, sem acento e em minúsculas, encontra “Puxada alta aberta”.
- Digitar “Supino reto barra” na criação dispara o aviso de exercício parecido.
- `create_exercise` aceita `load_mode` e `measure` válidos e rejeita valores fora da lista.
- Conflito de nome: com um exercício de professor chamado “Crucifixo na máquina”, a migração para e informa o caso, em vez de duplicar ou sobrescrever.

Critérios de aceite:

- 249 exercícios predefinidos (149 atuais mais 100 novos), 15 grupos e 55 equipamentos em um banco novo e no banco atual
- Ids dos 149 atuais inalterados
- Busca por nome e por apelido funcionando, sem diferenciar acento
- Aviso de parecido usando nome e apelidos
- Testes da lista acima passando no pipeline
- Tipos gerados, Security Advisor sem alerta novo e `docs/schema-coach-in.md` atualizado
- `/code-review` feito antes do `/pr`

## 9. Pontos em aberto para sua decisão

Cada ponto traz a minha recomendação. Sem resposta, eu sigo com ela. Os três primeiros mudam o produto e, por isso, viram regras numeradas a partir da 123 pelo processo de `needs-info`.

- **Carga “não” esconde a edição de carga na ficha?** Hoje a regra 26 vale para todo exercício. Recomendo esconder nos 38 exercícios de peso corporal, para o aluno não ver um campo de carga na prancha.
- **Medida em tempo.** Cinco exercícios (prancha frontal, prancha lateral, hollow hold, pendurado na barra fixa e agachamento isométrico na parede) são medidos em segundos. Recomendo que o campo de repetições da ficha aceite texto, como “30 s”. Se ele for só numérico, esses cinco precisam de outro tratamento.
- **Renomear exercícios que já estão em fichas.** Os 61 renomeados mudam o nome mostrado em qualquer treino já montado, e 11 mudam de grupo (só afeta o filtro da biblioteca). Os ids não mudam, então nada quebra. Decidido: seguir com a renomeação, porque não há professores usando fichas reais.
- **Três grupos novos.** Lombar, Adutores e Abdutores saíram de Costas e Glúteos. Decidido: manter os três, e o filtro da biblioteca passa de 12 para 15 grupos.
- **Cardio, funcional e mobilidade.** Recomendo não incluir agora, porque o contexto do produto os deixa fora do MVP e séries e repetições não descrevem bem esses exercícios.
- **Mergulho nas paralelas aparece duas vezes** (peito e tríceps, com o foco no nome). Recomendo manter assim, porque o grupo muscular é um só por exercício.
- **Nomes regionais.** Usei os termos mais comuns no Brasil e deixei os outros como apelido. Se o seu público usa outro termo, me diga e eu ajusto antes de gravar.
- **Onde salvar a versão final.** Recomendo `docs/contexto/catalogo-exercicios.md` no repositório, com espelho em `claude/catalogo-exercicios.md` no Project, e uma linha em `contexto-produto.md` apontando para ele nas regras 30 e 74.
