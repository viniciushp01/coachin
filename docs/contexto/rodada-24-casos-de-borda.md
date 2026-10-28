# Rodada 24 · Casos de borda E22 a E29 (27/10/2026)

Regras 117 a 121, mapa do Figma e pendências. **Ainda não foram mescladas** em `docs/contexto/contexto-produto.md` nem em `docs/contexto/design.md`. Nomes de página: `docs/contexto/figma-paginas.md`.

## Decisões

**117 · Treino concluído com solicitação aberta, e aviso de treino novo (E22 e E24).**
- Home com treino concluído e solicitação enviada mostra só "Solicitação enviada" (e "Cancelar solicitação" enquanto o professor não agiu, regra 103). **Sem o link "Continuar treinando com este treino"** nesse estado. O aluno continua podendo treinar, porque o treino segue ativo (regra 43).
- **Pop-up dentro do app ao abrir (ou voltar a abrir) quando um treino novo ficou ativo**: "Seu treino novo chegou", com "Ver meu treino" (principal) e "Fechar". Vale também quando o treino agendado começa (E24). Aparece uma vez por treino. **Sem notificação push** (notificações seguem fora do MVP).
- **Editar o treino ativo continua sem aviso** (regra 112 mantida).

**118 · Alterar treino agendado (E23).** Reutiliza a tela de Dados com os valores atuais e o botão "Salvar alterações". Mudando o início para hoje, aparece o aviso de que o treino fica ativo na hora e o atual vai para o Histórico (regra 106).

**119 · Aluno bloqueado (E26).** Tela "Sua conta está bloqueada" ("Fale com o administrador do Coach In ou com o seu professor"), com "Sair". **Só a tela: o bloqueio de aluno segue fora do MVP (regra 101)**, e o administrador não vê dados de alunos (regra 87). Se um dia houver a ação, essa regra precisa ser revista.

**120 · Exclusão de dados pelo próprio aluno (E27 e E28).** Substitui as regras 80 e 81. No Perfil, bloco Conta, a linha vira **"Excluir minha conta"**, com folha de confirmação ("Excluir sua conta?", "Manter minha conta" principal, "Excluir conta" em contorno). Apaga perfil, marcações, cargas e treinos, e leva ao Login com o toast "Conta excluída." Para voltar, o aluno cria uma conta nova. **Premissa a confirmar:** o mesmo e-mail pode ser usado de novo. Somem o chip "Pediu exclusão", o aviso e o botão "Excluir dados do aluno" do professor. Prazo e retenção legal (E25) ficam para depois, com o jurídico.

**121 · Sessão e "Sair" (E29, padrão de mercado).**
- Sessão ativa por 30 dias sem uso; vencida, leva ao Login com "Entre de novo" e "Sua sessão expirou por inatividade."
- Trocar a senha desconecta os outros aparelhos (sem tela).
- "Sair" abre uma confirmação ("Sair do app?"). Registros aguardando envio ficam guardados no aparelho (regra 116).

## Onde está no Figma (arquivo Coach In)
- **Professor · Treino**, seção **7 · Casos de borda (24ª rodada)**: Alterar agendado · 1 Dados (valores atuais) e · 2 Início hoje.
- **Aluno · Entrada**, seção **11 · Casos de borda (24ª rodada)**: Treino novo · 1 Pop-up · Sessão · 1 Sessão expirada · Conta · 1 Conta excluída (Login) · Conta · 2 Aluno bloqueado · Sessão · 2 Sair (folha) · Conta · 3 Excluir minha conta (folha).
- **Fluxo completo:** selos E22 a E29 atualizados.

## Feito depois (27/10, tarde)
- **Frames antigos trocados:** a linha do Perfil virou "Excluir minha conta" e a folha virou "Excluir sua conta?" em Aluno · Abas, Aluno · Ficha e painel do dia, Todas as telas, ↳ Fluxo · Conta e privacidade e Fluxo completo. "Perfil · 5 Pedido enviado" e a seção "Exclusão de dados (LGPD)" do professor foram removidos (inclusive toques 6 e 7 do fluxo de conta). A folha de "Sem conexão" agora diz "Para excluir sua conta…".
- **Todas as telas:** nova área "Aluno e Professor · casos de borda (24ª rodada)" no fim da página, com as seções 7 (Professor · Treino) e 11 (Aluno · Entrada).
- **Fluxo completo:** nós "A20 · Conta excluída" e "A21 · Aluno bloqueado" no lugar de "Pedido enviado" e "Conta removida"; nós do professor P16 e P17 removidos; cartões E22 a E29 em verde (E25 segue "ADIADO"), com textos novos.
- **FigJam (cópia na página "↳ FigJam"):** "Decisões - 24ª rodada".
- **Documentos:** regras 117 a 121 mescladas em `contexto-produto.md` (regras 80 e 81 marcadas como substituídas) e `design.md`.

## Pendências
- Replicar as seções 19 a 24 no board original do FigJam (`JNuuAUgUlhLvia1HZ5X3xO`), que não está aberto no plugin. Os textos antigos da 18ª rodada (exclusão pelo professor) continuam nele.
- Jurídico: prazo e retenção da exclusão da conta, dados de menores (regra 84) e telefone (regra 108). **Deixado para depois, por decisão de 27/10.**
- Os frames novos (pop-up, sessão expirada, conta excluída, aluno bloqueado, Sair, Excluir conta) ainda não têm toques numerados em "↳ Fluxo · Aluno · Entrada" nem raia própria no "Fluxo completo" (só os nós A20 e A21).
- Na página "↳ Fluxo · Conta e privacidade" há dois conjuntos de frames sobrepostos (cópia antiga).
- Premissa a confirmar: mesmo e-mail pode criar conta nova depois de excluir (E28).
