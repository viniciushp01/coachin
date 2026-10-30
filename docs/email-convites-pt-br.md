# E-mails de convite (pt-BR) · enviados pela Edge Function `enviar-convite`

Regra 136 (texto neutro, regra 144). Não usam o "Invite user" do Supabase: a função monta e envia
pelo mesmo SMTP dos e-mails de autenticação (`email-templates-pt-br.md`). O código está em
`supabase/functions/enviar-convite/textos.ts`: mudou aqui, mude lá.

- **Remetente:** "Coach In", fixo. O nome de quem convidou aparece só no assunto e no corpo.
- **Link:** segredo `APP_URL` + `/convite/` + token (regra 138). Endereço vindo do app é ignorado.
- **Destinatário:** só o e-mail cadastrado no convite (regra 140).

## Convite de aluno (link de 7 dias)
Assunto: [Professor] convidou você para o Coach In
```html
<h2>Seu convite para o Coach In</h2>
<p>[Professor] quer montar seus treinos no Coach In. Toque no link para criar seu acesso ou entrar com sua conta. O link vale por 7 dias e só pode ser usado uma vez.</p>
<p><a href="[APP_URL]/convite/[token]">Abrir convite</a></p>
<p>Se você não esperava este convite, pode ignorar esta mensagem.</p>
```

## Convite de professor (link de 1 dia)
Assunto: Seu acesso de professor no Coach In
```html
<h2>Seu acesso de professor</h2>
<p>Você recebeu um convite para usar o Coach In como professor. Toque no link para ativar seu acesso. O link vale por 1 dia e só pode ser usado uma vez.</p>
<p><a href="[APP_URL]/convite/[token]">Ativar acesso</a></p>
<p>Se você não esperava este convite, pode ignorar esta mensagem.</p>
```

O e-mail também leva a versão em texto puro: o corpo, "Abrir convite: [link]" (ou "Ativar
acesso: [link]") e a última frase. Os títulos (`<h2>`) são proposta, sem texto na regra.
