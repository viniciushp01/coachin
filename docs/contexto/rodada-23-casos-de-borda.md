# Rodada 23 · Casos de borda E15 a E21 (27/10/2026)

**As regras 110 a 116 estão em `docs/contexto/contexto-produto.md` e os componentes e padrões em `docs/contexto/design.md` (ambos atualizados em 27/10).** Este arquivo guarda o mapa do Figma e as pendências. Nomes de página: `docs/contexto/figma-paginas.md`.

**Atualização posterior (27/10, tarde):** os estados "Sem conexão" das telas que exigem internet **foram desenhados** (seção 4 abaixo). Isso **supera** o item "esses estados ainda não foram desenhados" da seção 8 do `contexto-produto.md` e a lista de telas da regra 116 no `design.md`, que ainda citam só Home, Ficha e Editar carga.

## Resumo das decisões
- **E15 sem internet (116):** fila local de envio (marcar, desfazer, editar carga) + treino ativo guardado para leitura; app web (PWA). Solicitar treino, editar perfil e pedir exclusão exigem conexão.
- **E16 (110):** dia entre dois treinos pertence ao treino atual.
- **E17 (111):** "Ficha de hoje" = próxima ficha que existe; letras fixas, sem renumerar nem reaproveitar.
- **E18 (112):** o aluno vê sempre a versão atual do treino, sem aviso.
- **E19 (113):** a folha de ocultar diz que as fichas que já usam o exercício continuam.
- **E20 (114):** nomes truncam em 1 linha (exercício no card da ficha e prévia: 2 linhas).
- **E21 (115):** fuso do aluno, inclusive no mínimo "hoje" do início do treino.

## Telas que exigem conexão (desenhadas, padrão da regra 116)
Sem vermelho (ficar offline não é erro). Texto de cada uma:
- **Frequência · 2 Sem conexão** (meses anteriores), **Progressão · 4** e **Histórico · 3**: `EmptyState` "Sem conexão" com explicação da aba, botão "Tentar de novo" e menu inferior com a aba ativa. Ex.: "A Frequência precisa de internet para abrir os meses anteriores. Seu treino e suas marcações recentes continuam no Início."
- **Home · 9 Solicitar treino sem conexão:** folha "Sem conexão" ("Para pedir um novo treino, conecte-se à internet. Seu treino continua disponível para leitura."), "Tentar de novo" (principal) e "Fechar".
- **Perfil · 7 Editar dados sem conexão:** `Notice` neutro "Sem conexão" ("Seus dados continuam na tela. Toque em Salvar alterações quando a internet voltar.") abaixo da frase do professor; o botão "Salvar alterações" segue habilitado.
- **Perfil · 8 Pedir exclusão sem conexão:** folha "Sem conexão" ("Para enviar o pedido de exclusão, conecte-se à internet. Nada foi enviado."), "Tentar de novo" e "Fechar".
- Decisão de produto implícita: a Progressão sem conexão ainda deixa editar a carga na ficha (vai para a fila).

## Onde está no Figma (arquivo Coach In)
- **Fluxo completo:** cartões E15 a E21 em verde ("COBERTO · 23ª RODADA"). Raia **"ALUNO · SEM CONEXÃO (FILA LOCAL E TREINO GUARDADO; S6 A S11: TELAS QUE EXIGEM INTERNET)"** no fim do quadro (y 4560; quadro com 5200 de altura): S1 Home sem conexão → S2 Editar carga → S3 Marcada → S4 Conexão voltou; S5 Abre sem conexão e sem treino salvo (alternativa); **S6 Frequência, S7 Progressão, S8 Histórico, S9 Solicitar treino, S10 Editar dados, S11 Pedir exclusão** (sem setas: são alternativas).
- **Aluno · Ficha e painel do dia**, seção **3 · Sem internet (23ª rodada)**: Ficha · 4 Marcada sem conexão · Ficha · 5 Editar carga sem conexão · Home · 6 Sem conexão · Home · 7 Conexão voltou · Home · 8 Sem conexão e sem treino salvo. Seção **4 · Sem internet · telas que exigem conexão (23ª rodada)**: Frequência · 2, Progressão · 4, Histórico · 3, Home · 9 Solicitar treino, Perfil · 7 Editar dados, Perfil · 8 Pedir exclusão (todas "sem conexão").
- **Professor · Treino**, seção **6 · Casos de borda (23ª rodada)**: Criar treino · 17 Fichas · textos longos · Lista · 6 Nome longo · Home · 6 Treino e ficha com nome longo. Biblioteca · 3 Ocultar da busca com o texto novo (também em "Todas as telas" e "↳ Fluxo · Professor · Treino"; folha 24 px mais alta).
- **Todas as telas:** área "ALUNO E PROFESSOR · CASOS DE BORDA (23ª RODADA)" no fim da página, com cópias das seções 3 e 4 do aluno e da seção 6 do professor.
- **Componentes com truncamento:** ReorderRow, SectionRow, SheetRow, WorkoutRow, ActiveWorkoutCard, TodayCard, ExerciseCard, StudentRow (detalhes no `design.md`).
- **FigJam** (cópia na página "↳ FigJam"): "Decisões - 23ª rodada (casos E15 a E21…)".

## Pendências
- Replicar as seções 19 a 23 no board original do FigJam (`JNuuAUgUlhLvia1HZ5X3xO`), que não está aberto no plugin.
- Fluxo com toques numerados para a raia "sem conexão" em "↳ Fluxo · Aluno · Entrada" (não feito).
- Lado do professor sem internet: não decidido nem desenhado (a regra 116 vale só para o aluno).
- Mesclar as telas desta atualização em `contexto-produto.md` (seção 8 e regra 116) e `design.md` (lista de páginas), se quiser tudo no mesmo arquivo.
- Jurídico: dados de menores (regra 84), telefone (regra 108) e retenção (regra 81).
- Casos **E22 a E29** do quadro "Fluxo completo": ficam para outra sessão.
