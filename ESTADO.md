# Coach In · Estado do projeto (gerado)

Gerado em 26/11/2026, 16:42 (Brasília) a partir da `main` @ `ea45a90` (2026-11-26 · Merge pull request #168 from viniciushp01/fix/pwa-atualiza-sozinho). **Não edite**: é regenerado a cada push, PR, issue e fim de CI. Se a data acima for antiga demais, desconfie e diga ao Vinicius.

## Onde está cada coisa
- Repositório (fonte da verdade): https://github.com/viniciushp01/coachin · produção: https://coachin.vercel.app
- Figma: arquivo **Coach In** `IDP8M2IKanbn60dyqmzjh1` (mapa de páginas em `docs/contexto/figma-paginas.md`) · FigJam do produto `JNuuAUgUlhLvia1HZ5X3xO`
- Supabase: `coach-in-app` (ref `kfjjiajxgbsqpuskxbzb`, sa-east-1) · desenho e funções em `docs/schema-coach-in.md`
- Regras de negócio: `docs/contexto/contexto-produto.md` (grande: nunca leia inteiro; use o índice `INDICE-REGRAS.md` desta mesma branch)

## Números
- Regras: 1 a 177. **Próxima regra: 178**
- Migrations no repositório: 18 · última: `20261123131955_my_pending_student_invite.sql`
- CI na main: success (CI, commit ea45a90) · https://github.com/viniciushp01/coachin/actions/runs/45885373222

## Plano e etapa atual (trecho vivo do WORKFLOW)
#### Plano até o piloto (decidido em 05/11/2026)

**Etapa atual: 4. Piloto**

**Objetivo:** um professor real monta o treino, e 2 ou 3 alunos reais fazem esse treino pelo app durante 2 semanas. O resto se decide com base nesse uso. Vale sobre a ordem da tabela da Fase 1.

| Etapa | O que entra |
|---|---|
| 1. ~~Fechar a fatia 4~~ | Concluída em 05/11/2026: criar e editar treino, arrastar, biblioteca (buscar, criar, ocultar) |
| 2. ~~Fatia 5 reduzida~~ | Concluída em 05/11/2026 (#115): Início com semana e "Ficha de hoje", ficha com exercícios e descanso, marcar como feito, desfazer, marcar dia passado, registrar carga. Menu só com o que existe, e um jeito de sair da conta |
| 3. ~~Fatia 8~~ | Concluída em 05/11/2026 (#117): PWA e fila offline (regras 38 e 116) |
| 4. Piloto | **Em andamento.** Teste de ponta a ponta dos três papéis, iPhone e Android com o app instalado, 2 semanas de uso |

Ao concluir uma etapa, risque o nome dela na tabela (~~assim~~): o ESTADO.md usa a primeira etapa sem risco como a etapa atual.

**Adiados até o piloto responder:**

- **#97** (botão "Agendar novo treino"). O #98 (treino antes do aceite, regras 122 e 153) e o #94 (ajustar medida e carga, regras 123 e 151 (4)) foram feitos antes do piloto, a pedido.
- **Fatia 10** (a 7a, acompanhar o aluno em só leitura, e a 7b, solicitação de novo treino, foi feita antes do piloto e retirada em seguida, #141, #143 e #149) e, na fatia 5, o aviso de treinar além da frequência e a sugestão de descanso. O pop-up de treino novo foi feito antes do piloto (#151, regra 170).

**Não será explorado enquanto não houver demanda real** (reavaliar se surgir reclamação): a **solicitação de novo treino** pelo app (regra 169). O banco segue dormente (`docs/schema-coach-in.md`).

**Antes de abrir para o público, continuam obrigatórios:** a fatia 9 e a Fase 2. No piloto, combinar o uso dos dados com os participantes e atender à exclusão de conta manualmente, se alguém pedir.

## PRs abertos
Nenhum PR aberto.

## PRs mergeados recentemente
- #168 fix: app se atualiza sozinho, sem aviso e nunca no meio do treino (regra 177) · mergeado em 2026-11-26
- #167 docs: frame "Confirmar e-mail" no Figma (regra 176, #165) · mergeado em 2026-11-26
- #166 fix: link de confirmação só confirma ao toque em "Confirmar e-mail" (regra 176, #165) · mergeado em 2026-11-26
- #164 feat: abas do aluno com gráfico de evolução da carga (regra 175, #163) · mergeado em 2026-11-26
- #162 fix: home do aluno vira o dia com o app aberto (#161) · mergeado em 2026-11-23
- #160 feat: Próximo treino em seção própria na home do aluno (regra 174, #159) · mergeado em 2026-11-23
- #158 feat: aluno sem professor vê o convite pendente do seu e-mail (regra 173, #157) · mergeado em 2026-11-23
- #156 feat: convite sobrevive à confirmação de e-mail em outro navegador (regra 172, #155) · mergeado em 2026-11-22
- #154 feat: setas de semana na home do aluno (regra 171) · mergeado em 2026-11-17
- #152 Pop-up "Seu treino novo chegou" + backfill do workout_seen (regra 170) · mergeado em 2026-11-13

## Issues abertas
**sem rótulo de triagem** (2)
- #161 Home do aluno não vira o dia com o app aberto
- #97 Fatia 4: treino agendado na tela do aluno (aviso, alterar, cancelar, agendar novo)

**ready-for-agent** (1)
- #153 Setas para navegar entre semanas na home do aluno

## Pontos em aberto do produto (trecho vivo do contexto-produto)
Nenhum ponto de produto bloqueando o MVP no momento.

Pendências menores (não são regras ainda):
- **Supabase Auth, antes de abrir ao público (Security Advisor de 12/11/2026, só WARN, sem erro):** (1) "validade do OTP maior que 1 hora" (`auth_otp_long_expiry`): hoje 86400 s (1 dia) por decisão dos links de confirmação e de "Esqueci a senha"; decidir se reduz ou se aceita o risco; (2) "proteção contra senhas vazadas desligada" (`auth_leaked_password_protection`): **decidido em 12/11/2026 (Vinicius): não ligar por ora**; basta a proteção básica do plano gratuito (senha mínima de 8 com letras e dígitos e confirmação de e-mail). O aviso WARN do Advisor fica aceito; reavaliar se o projeto migrar para plano pago. Nada disso bloqueia o piloto.
- **Solicitação de novo treino**: fora do escopo até haver demanda (regra 169). ~~Entrada permanente de "Solicitar novo treino" no Perfil do aluno (fatia 6, regra 168)~~ deixou de existir.
- **Exclusão da conta (regra 120)**: prazo e retenção legal (E25), com o jurídico (deixado para depois). Premissa a confirmar: o mesmo e-mail pode criar uma conta nova e os dados antigos não voltam (E28).
- **Jurídico**: dados de menores (regra 84), telefone (regra 108) e retenção.
- **Termos de uso e Política de privacidade (Perfil do aluno, fatia 6)**: o texto depende do jurídico. Por ora as duas linhas aparecem em "Sobre", sem seta e sem toque, até haver destino.
- **Sessão (regra 121)**: confirmar os 30 dias sem uso e o aviso de troca de senha em outros aparelhos (padrão de mercado, não validado).
- **Aluno bloqueado (regra 119)**: sem ação que dispare a tela; exigiria rever a regra 87 (o administrador não vê alunos).

Detalhes de design a confirmar (não são regras): **cardio (regra 126)**: nome do cartão, ícones por equipamento e o texto da seção "Cardio (opcional)" na edição da ficha; na home "seguindo com o mesmo treino", o rótulo "Treino concluído" no lugar de "Semana X de Y" e a barra de progresso cheia; na caixa de confirmação do aviso de dados, a cor laranja quando marcada; na lista de alunos, a linha sem avatar (não coube com os dois chips); **na ficha, como mostrar o exercício com carga "opcional" (hoje igual ao "sim", com o campo livre) e se o campo de repetições aceita texto em todos os exercícios ou só nos medidos em tempo (regras 123 e 124)**.

## Documentos
| Arquivo | Tamanho | Última alteração | Texto cru |
|---|---|---|---|
| `CLAUDE.md` | 8 KB | 2026-11-23 | https://raw.githubusercontent.com/viniciushp01/coachin/main/CLAUDE.md |
| `docs/WORKFLOW.md` | 24 KB | 2026-11-26 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/WORKFLOW.md |
| `docs/schema-coach-in.md` | 41 KB | 2026-11-23 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/schema-coach-in.md |
| `docs/adr/0001-stack.md` | 3 KB | 2026-11-26 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/adr/0001-stack.md |
| `docs/contexto/catalogo-exercicios.md` | 45 KB | 2026-11-03 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/catalogo-exercicios.md |
| `docs/contexto/contexto-produto.md` | 156 KB | 2026-11-26 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/contexto-produto.md |
| `docs/contexto/design.md` | 44 KB | 2026-11-23 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/design.md |
| `docs/contexto/figma-paginas.md` | 5 KB | 2026-11-26 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/figma-paginas.md |
| `docs/contexto/handoff-design-system.md` | 7 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/handoff-design-system.md |
| `docs/contexto/prompts-lotes-3-e-4.md` | 10 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/prompts-lotes-3-e-4.md |
| `docs/contexto/rodada-19-casos-de-borda.md` | 2 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/rodada-19-casos-de-borda.md |
| `docs/contexto/rodada-22-casos-de-borda.md` | 2 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/rodada-22-casos-de-borda.md |
| `docs/contexto/rodada-23-casos-de-borda.md` | 5 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/rodada-23-casos-de-borda.md |
| `docs/contexto/rodada-24-casos-de-borda.md` | 5 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/rodada-24-casos-de-borda.md |

## Como ler sem gastar tokens
1. Achar a regra: leia `INDICE-REGRAS.md` (uma linha por regra).
2. Ler a regra: com clone ou shell, `grep -n "^NNN\. " docs/contexto/contexto-produto.md`; sem shell, busque o texto cru e peça só as regras N a M.
3. Componentes e tokens: `docs/contexto/design.md`, só a parte que o ticket cita.
