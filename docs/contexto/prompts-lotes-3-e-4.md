# Prompts · Lote 3 (entrada do aluno) e Lote 4 (professor)

Cada prompt é para colar em um chat novo, anexado ao Project "Coach In". Os arquivos de apoio já estão no Project: `docs/contexto/contexto-produto.md` (regras e telas), `docs/contexto/design.md` (design system, fonte de verdade visual) e `docs/contexto/handoff-design-system.md` (manhas do plugin do Figma).

---

## Prompt · Lote 3 (entrada do aluno)

Estou desenvolvendo o app **Coach In** (treinos de academia gerenciado por um professor). Preciso desenhar o **lote 3: telas de entrada do aluno** no arquivo Figma Coach In (chave `IDP8M2IKanbn60dyqmzjh1`), usando o **Figma Desktop Bridge** (ferramentas `figma-console`, não o Figma MCP oficial).

**Leia primeiro, nesta ordem:** `docs/contexto/contexto-produto.md` (principalmente regras 39 a 42, seção 4 "Login por convite" e seção 6, fluxo do aluno), `docs/contexto/design.md` (tokens, componentes, regras de montagem) e `docs/contexto/handoff-design-system.md` (manhas do plugin). Depois abra no Figma as páginas **Style guide**, **Componentes** e **Abas do aluno** para ver o padrão visual já aplicado.

**Telas a desenhar** (390 de largura, todas em pt-BR):
1. **Convite recebido** (abertura do link): boas-vindas, nome do professor e botão para criar o acesso. Estados: convite válido, **convite expirado** (7 dias; orientar a pedir novo convite ao professor) e **convite já usado** (uso único; levar ao login).
2. **Criar acesso:** e-mail (vindo do cadastro feito pelo professor) e senha. Estados: padrão, preenchido, erro de campo.
3. **Primeiro acesso (perfil):** **aviso claro de que o professor vê esses dados para montar o treino (dados de saúde, LGPD)** e o formulário de perfil: nome, data de nascimento, altura, peso, restrições ou dores. Desenhar o aviso e o formulário como passos de um mesmo fluxo, com a confirmação do aviso antes de continuar.
4. **Login:** e-mail e senha, "Esqueci a senha". Estados: padrão e erro de credenciais (vermelho só para erro, tom acolhedor).
5. **Esqueci a senha:** pedir e-mail → confirmação de e-mail enviado → redefinir senha → senha alterada.
6. **Entrada no app:** depois do primeiro acesso ou do login, mostrar o destino: Home com treino ativo, ou tela "sem treino" (já existem na página "Home do aluno"; apenas ligar no fluxo).
7. **Extra (mesmo lote):** **Solicitar novo treino** na home e na tela "sem treino": estado "Solicitação enviada" (botão desabilitado) e **cancelar solicitação** (confirmação). Regras 37 e 40.

**Entregáveis:**
- Uma nova página **"Entrada do aluno"** no Coach In com as telas organizadas por fluxo (convite → criar acesso → primeiro acesso → app; login; esqueci a senha; solicitação) e uma página ou seção de **fluxo** com setas e círculos numerados mostrando onde o usuário toca (mesmo padrão da página "Fluxo · Painel do dia").
- Montar tudo com **instâncias** dos componentes de `Componentes`. O design.md já prevê que este lote vai precisar de componentes novos (campo de senha com mostrar/ocultar, botão de texto, etc.): crie-os na página Componentes com variáveis e estilos do design system e **registre-os na Parte 2 do `docs/contexto/design.md`** (leia o arquivo, edite e regrave o conteúdo completo).
- Tela sem menu inferior nas telas de entrada (elas ficam antes do login). Respeitar: múltiplos de 4, só variáveis, **um único botão laranja por tela**.

**Regras de trabalho:**
- **Não invente regra de negócio.** Pontos que o produto ainda não definiu (ex.: requisitos mínimos de senha, se o aviso de LGPD exige um "li e concordo", onde o aluno pede exclusão dos dados, e-mail de redefinição com link ou código): **liste as dúvidas e pergunte antes de desenhar** essas partes. Sem requisito definido, use texto neutro.
- Antes de começar, mostre o plano (telas, estados, componentes novos) e as dúvidas.
- Entregue em partes: primeiro 1 a 3, depois 4 e 5, depois 6 e 7, mostrando prints e esperando meu ok.

**Ao final, deixe tudo atualizado** (eu preciso de todos os documentos em dia):
- `docs/contexto/contexto-produto.md`: novas decisões como regras numeradas (a partir da 46), descrição das telas na seção 4 e referência à página do Figma. Leia o arquivo e regrave o conteúdo completo.
- `docs/contexto/design.md`: componentes novos na Parte 2.
- **Board FigJam** "Aplicativo de treinos - MVP" (`JNuuAUgUlhLvia1HZ5X3xO`, página "Ideias de Feature") **e a cópia na página "FigJam" do Coach In**: nova seção "Decisões - 14ª rodada" (clone a seção da 13ª rodada e troque os textos; notas não clonam no arquivo de design, mas seções com notas sim) e ajuste dos textos antigos que ficarem desatualizados.

---

## Prompt · Lote 4 (professor)

Estou desenvolvendo o app **Coach In** (treinos de academia gerenciado por um professor). Preciso desenhar o **lote 4: lado do professor** no arquivo Figma Coach In (chave `IDP8M2IKanbn60dyqmzjh1`), usando o **Figma Desktop Bridge** (ferramentas `figma-console`, não o Figma MCP oficial).

**Leia primeiro, nesta ordem:** `docs/contexto/contexto-produto.md` (seção 5 "lado do professor", seção 6 fluxo do professor, regras 1 a 8, 30 a 37, 40 e 41), `docs/contexto/design.md` (tokens, componentes, regras de montagem) e `docs/contexto/handoff-design-system.md` (manhas do plugin). Depois abra no Figma as páginas **Style guide**, **Componentes** e as telas do aluno ("Home do aluno", "Ficha e painel do dia", "Abas do aluno") para manter a mesma linguagem visual.

**Decisão que eu preciso de você antes de desenhar: plataforma.** O produto ainda não definiu se o professor usa o **mesmo app no celular (390 de largura)** ou uma **versão web/desktop**. Faça essa pergunta primeiro, com a sua recomendação e o impacto de cada opção (montar treino com várias fichas e exercícios costuma ficar melhor em tela larga). Se a resposta for web, defina a grade e os componentes de layout desktop no design system antes das telas.

**Telas a desenhar** (todas em pt-BR). O lote é grande, então divida em **4A, 4B e 4C** e entregue uma parte por vez:

**4A · Alunos e convite**
1. **Lista de alunos:** nome, **status (ativo · sem treino · quase no fim, faltam 7 dias ou menos)** e **último treino feito**. Estados: com alunos e vazia (primeiro acesso do professor).
2. **Cadastrar aluno** e **enviar convite** (link ou e-mail). Estados do convite: enviado, **expirado** (7 dias), **reenviar** (link expirado, e-mail errado ou aluno que já tem conta). O convite é de uso único e preso ao cadastro do aluno.

**4B · Acompanhar o aluno**
3. **Tela do aluno:** status, treino ativo, calendário (com o mesmo painel do dia, só leitura para o professor se a regra não disser o contrário: pergunte), **progressão de carga** (lista de exercícios com histórico), **perfil do aluno somente leitura com "atualizado em"** e **histórico de treinos do aluno (lista simples)**. Inclua o caso do treino concluído em que o aluno segue treinando (marcações depois da data de fim aparecem normalmente, regra 43).
4. **Solicitações de novo treino:** receber a solicitação, ver quem pediu e atender (leva para "Criar treino"). A solicitação se fecha quando o novo treino fica ativo (regra 40).

**4C · Montagem de treino**
5. **Criar treino:** nome → início (hoje ou futuro; **nunca data passada**) → nº de semanas (mostrar o **fim calculado** = início + 7 × semanas − 1 dia) → frequência sugerida (só informação) → fichas (A, B, C…) → exercícios (séries, reps, descanso, observação por exercício) → salvar. Estados: início hoje (fica ativo, anterior vai ao Histórico) e início futuro (**agendado**, só o professor vê; pode alterar ou cancelar).
6. **Biblioteca de exercícios:** busca antes de criar, **aviso de exercício parecido**, criar novo exercício (privado do professor), **ocultar duplicado da busca** (sem excluir; exercícios nunca são excluídos). Sem vídeo, GIF ou link.
7. **Editar o treino ativo:** trocar exercícios, séries e reps, adicionar ou remover fichas, sem criar outro treino (regras 6 e 7).

**Entregáveis:**
- Nova página **"Professor"** no Coach In (ou uma por parte: "Professor · Alunos", "Professor · Acompanhar", "Professor · Treino") com as telas organizadas por fluxo e uma seção de **fluxo** com setas e círculos numerados mostrando onde o professor toca ou clica (mesmo padrão da página "Fluxo · Painel do dia").
- Montar com **instâncias** de `Componentes`. Componentes novos (linha de aluno com status, campo de busca, seletor de data, passo a passo, linha de exercício editável, etc.): crie-os com variáveis e estilos do design system e **registre na Parte 2 do `docs/contexto/design.md`** (leia o arquivo, edite e regrave o conteúdo completo).
- Respeitar: múltiplos de 4, só variáveis, **um único botão laranja por tela**, tom acolhedor.

**Regras de trabalho:**
- **Não invente regra de negócio.** Dúvidas abertas devem virar perguntas (ex.: o professor pode marcar ficha feita pelo aluno? quantos alunos cabem na lista antes de paginar? como o professor vê a solicitação, em lista própria ou dentro do aluno?). Pergunte antes de desenhar a parte afetada.
- Antes de começar, mostre o plano (telas, estados, componentes novos) e as dúvidas. Entregue por partes (4A, 4B, 4C), com prints, esperando meu ok.

**Ao final de cada parte, deixe tudo atualizado:**
- `docs/contexto/contexto-produto.md`: novas decisões como regras numeradas (continue a numeração), seção 5 detalhada com as telas e a referência às páginas do Figma. Leia o arquivo e regrave o conteúdo completo.
- `docs/contexto/design.md`: componentes novos na Parte 2.
- **Board FigJam** "Aplicativo de treinos - MVP" (`JNuuAUgUlhLvia1HZ5X3xO`, página "Ideias de Feature") **e a cópia na página "FigJam" do Coach In**: nova seção de decisões (clone a seção da rodada anterior e troque os textos) e ajuste dos textos antigos que ficarem desatualizados.

---

## Observações para quem for executar
- Se os lotes 3 e 4 forem feitos em chats diferentes ao mesmo tempo, as numerações de regras e rodadas podem colidir. Faça **um de cada vez**, ou combine antes quem usa quais números.
- `figma_execute` tem limite de 5 s por padrão; use o parâmetro `timeout` em varreduras grandes (ver handoff).
