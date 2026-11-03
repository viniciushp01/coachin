# E-mails de autenticação (pt-BR) · para colar no painel do Supabase

Onde colar: Authentication > Emails > Templates (só libera depois de salvar o SMTP próprio).
Mantenha as variáveis `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` e `{{ .Token }}` exatamente assim.
Tom do design.md: acolhedor, sem culpa. Validade do link: 1 dia (regras 88 e 89); isso exige
"Email OTP expiration" = 86400 em Authentication > Sign In / Providers > Email.

## Confirm signup
Assunto: Confirme seu e-mail no Coach In
```html
<h2>Confirme seu e-mail</h2>
<p>Falta só um passo para entrar no Coach In. Toque no botão abaixo para confirmar este e-mail.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar e-mail</a></p>
<p>O link vale por 1 dia. Se você não criou uma conta, pode ignorar esta mensagem.</p>
```

## Reset password
Assunto: Crie uma nova senha no Coach In
```html
<h2>Crie uma nova senha</h2>
<p>Recebemos um pedido para trocar a senha da sua conta. Toque no botão abaixo para escolher uma nova.</p>
<p><a href="{{ .ConfirmationURL }}">Criar nova senha</a></p>
<p>O link vale por 1 dia e só pode ser usado uma vez. Se você não fez esse pedido, pode ignorar esta mensagem: sua senha continua a mesma.</p>
```

## Magic link
Assunto: Seu link de acesso ao Coach In
```html
<h2>Seu link de acesso</h2>
<p>Toque no botão abaixo para entrar no Coach In.</p>
<p><a href="{{ .ConfirmationURL }}">Entrar</a></p>
<p>Se você não pediu este link, pode ignorar esta mensagem.</p>
```

## Change email address
Assunto: Confirme seu novo e-mail no Coach In
```html
<h2>Confirme seu novo e-mail</h2>
<p>Você pediu para trocar o e-mail da sua conta de {{ .Email }} para {{ .NewEmail }}. Toque no botão abaixo para confirmar.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar novo e-mail</a></p>
<p>Se você não pediu essa troca, ignore esta mensagem.</p>
```

## Reauthentication
Assunto: Seu código de confirmação do Coach In
```html
<h2>Confirme que é você</h2>
<p>Use este código para continuar:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Se você não pediu este código, pode ignorar esta mensagem.</p>
```

## Invite user
Não é usado: os convites do Coach In são links gerados pelo app (regra 92), não o convite do Supabase.
Se quiser traduzir mesmo assim, Assunto: Você foi convidado para o Coach In.
