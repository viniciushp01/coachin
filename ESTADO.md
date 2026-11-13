# Coach In · Estado do projeto (gerado)

Gerado em 13/11/2026, 09:25 (Brasília) a partir da `main` @ `e3e828c` (2026-11-13 · Merge pull request #152 from viniciushp01/feat/151-popup-treino-novo). **Não edite**: é regenerado a cada push, PR, issue e fim de CI. Se a data acima for antiga demais, desconfie e diga ao Vinicius.

## Onde está cada coisa
- Repositório (fonte da verdade): https://github.com/viniciushp01/coachin · produção: https://coachin.vercel.app
- Figma: arquivo **Coach In** `IDP8M2IKanbn60dyqmzjh1` (mapa de páginas em `docs/contexto/figma-paginas.md`) · FigJam do produto `JNuuAUgUlhLvia1HZ5X3xO`
- Supabase: `coach-in-app` (ref `kfjjiajxgbsqpuskxbzb`, sa-east-1) · desenho e funções em `docs/schema-coach-in.md`
- Regras de negócio: `docs/contexto/contexto-produto.md` (grande: nunca leia inteiro; use o índice `INDICE-REGRAS.md` desta mesma branch)

## Números
- Regras: 1 a 170. **Próxima regra: 171**
- Migrations no repositório: 17 · última: `20261112180000_backfill_workout_seen.sql`
- CI na main: success (CI, commit e3e828c) · https://github.com/viniciushp01/coachin/actions/runs/43424676562

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
- **Fatias 6 e 10** (a 7a, acompanhar o aluno em só leitura, e a 7b, solicitação de novo treino, foi feita antes do piloto e retirada em seguida, #141, #143 e #149) e, na fatia 5, o aviso de treinar além da frequência e a sugestão de descanso. O pop-up de treino novo foi feito antes do piloto (#151, regra 170).

**Não será explorado enquanto não houver demanda real** (reavaliar se surgir reclamação): a **solicitação de novo treino** pelo app (regra 169). O banco segue dormente (`docs/schema-coach-in.md`).

**Antes de abrir para o público, continuam obrigatórios:** a fatia 9 e a Fase 2. No piloto, combinar o uso dos dados com os participantes e atender à exclusão de conta manualmente, se alguém pedir.

## PRs abertos
Nenhum PR aberto.

## PRs mergeados recentemente
- #152 Pop-up "Seu treino novo chegou" + backfill do workout_seen (regra 170) · mergeado em 2026-11-13
- #150 feat: retirar a solicitação de novo treino do app (regra 169, #149) · mergeado em 2026-11-12
- #148 docs: não ligar a proteção contra senhas vazadas por ora · mergeado em 2026-11-12
- #147 docs: alinhar WORKFLOW ao ESTADO e registrar pendências de Auth · mergeado em 2026-11-12
- #145 docs: manter a documentação sempre atualizada · mergeado em 2026-11-12
- #144 feat(pedido): solicitação de novo treino, aluno e professor (fatia 7b, #143) · mergeado em 2026-11-12
- #142 feat(alunos): professor acompanha o aluno em só leitura (fatia 7a, #141) · mergeado em 2026-11-12
- #137 feat(alunos): cadastrar o aluno sem convite e enviar o convite depois (regra 164) · mergeado em 2026-11-12
- #140 infra: alinhar documentos ao estado real (Etapas 2 e 3 concluídas) · mergeado em 2026-11-12
- #139 feat(ui): nome do exercício nunca é cortado (regra 165, #138) · mergeado em 2026-11-12

## Issues abertas
**sem rótulo de triagem** (1)
- #97 Fatia 4: treino agendado na tela do aluno (aviso, alterar, cancelar, agendar novo)

## Pontos em aberto do produto (trecho vivo do contexto-produto)
Nenhum ponto de produto bloqueando o MVP no momento.

Pendências menores (não são regras ainda):
- **Supabase Auth, antes de abrir ao público (Security Advisor de 12/11/2026, só WARN, sem erro):** (1) "validade do OTP maior que 1 hora" (`auth_otp_long_expiry`): hoje 86400 s (1 dia) por decisão dos links de confirmação e de "Esqueci a senha"; decidir se reduz ou se aceita o risco; (2) "proteção contra senhas vazadas desligada" (`auth_leaked_password_protection`): **decidido em 12/11/2026 (Vinicius): não ligar por ora**; basta a proteção básica do plano gratuito (senha mínima de 8 com letras e dígitos e confirmação de e-mail). O aviso WARN do Advisor fica aceito; reavaliar se o projeto migrar para plano pago. Nada disso bloqueia o piloto.
- **Solicitação de novo treino**: fora do escopo até haver demanda (regra 169). ~~Entrada permanente de "Solicitar novo treino" no Perfil do aluno (fatia 6, regra 168)~~ deixou de existir.
- **Exclusão da conta (regra 120)**: prazo e retenção legal (E25), com o jurídico (deixado para depois). Premissa a confirmar: o mesmo e-mail pode criar uma conta nova e os dados antigos não voltam (E28).
- **Jurídico**: dados de menores (regra 84), telefone (regra 108) e retenção.
- **Sessão (regra 121)**: confirmar os 30 dias sem uso e o aviso de troca de senha em outros aparelhos (padrão de mercado, não validado).
- **Aluno bloqueado (regra 119)**: sem ação que dispare a tela; exigiria rever a regra 87 (o administrador não vê alunos).

Detalhes de design a confirmar (não são regras): **cardio (regra 126)**: nome do cartão, ícones por equipamento e o texto da seção "Cardio (opcional)" na edição da ficha; na home "seguindo com o mesmo treino", o rótulo "Treino concluído" no lugar de "Semana X de Y" e a barra de progresso cheia; na caixa de confirmação do aviso de dados, a cor laranja quando marcada; na lista de alunos, a linha sem avatar (não coube com os dois chips); **na ficha, como mostrar o exercício com carga "opcional" (hoje igual ao "sim", com o campo livre) e se o campo de repetições aceita texto em todos os exercícios ou só nos medidos em tempo (regras 123 e 124)**.

## Documentos
| Arquivo | Tamanho | Última alteração | Texto cru |
|---|---|---|---|
| `CLAUDE.md` | 8 KB | 2026-11-13 | https://raw.githubusercontent.com/viniciushp01/coachin/main/CLAUDE.md |
| `docs/WORKFLOW.md` | 19 KB | 2026-11-13 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/WORKFLOW.md |
| `docs/schema-coach-in.md` | 39 KB | 2026-11-13 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/schema-coach-in.md |
| `docs/adr/0001-stack.md` | 3 KB | 2026-10-28 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/adr/0001-stack.md |
| `docs/contexto/catalogo-exercicios.md` | 45 KB | 2026-11-03 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/catalogo-exercicios.md |
| `docs/contexto/contexto-produto.md` | 146 KB | 2026-11-12 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/contexto-produto.md |
| `docs/contexto/design.md` | 44 KB | 2026-11-12 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/design.md |
| `docs/contexto/figma-paginas.md` | 5 KB | 2026-11-12 | https://raw.githubusercontent.com/viniciushp01/coachin/main/docs/contexto/figma-paginas.md |
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
