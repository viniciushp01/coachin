-- =====================================================================
-- Envio do convite por e-mail (issue #52, regras 136, 139 e 140).
-- A Edge Function `enviar-convite` chama claim_invite_email com o token,
-- como quem pediu o envio (o JWT do app segue na chamada). A função confere
-- tudo no banco e só então a Edge Function envia, ao e-mail do convite.
-- =====================================================================

-- Último envio por e-mail. O app lê para mostrar "Reenviar em N s" (regra 139).
alter table public.invites add column email_sent_at timestamptz;

-- Confere que o token é de um convite pendente de quem chama (professor dono do aluno ou
-- administrador, como em reissue_invite), que tem e-mail e que o último envio ao mesmo
-- aluno e e-mail (ou ao mesmo e-mail de professor) foi há 60 s ou mais. Reenviar cria um
-- convite novo, por isso o intervalo olha os convites da mesma pessoa, não só a linha do token;
-- "Corrigir e-mail" (outro endereço) não espera.
-- Marca o envio e devolve para quem enviar. O intervalo conta a tentativa: se o SMTP falhar,
-- o link segue valendo e pode ser copiado (regra 136).
create or replace function public.claim_invite_email(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v       public.invites%rowtype;
  v_state text;
  v_name  text;
begin
  if p_token is null or p_token = '' then raise exception 'invalid_arguments'; end if;
  select * into v from public.invites where token_hash = private.hash_token(p_token) for update;
  if not found then raise exception 'invite_not_found'; end if;

  if v.kind = 'student' then
    if private.my_role() is distinct from 'professor' or v.inviter_id <> v_uid then
      raise exception 'forbidden';
    end if;
  elsif private.my_role() is distinct from 'admin' then
    raise exception 'forbidden';
  end if;

  v_state := private.invite_state(v.status, v.expires_at);
  if v_state = 'accepted' then raise exception 'invite_used'; end if;
  if v_state = 'replaced' then raise exception 'invite_replaced'; end if;
  if v_state = 'declined' then raise exception 'invite_declined'; end if;
  if v_state = 'expired' then raise exception 'invite_expired'; end if;
  if v.email is null then raise exception 'invite_no_email'; end if;

  if exists (
    select 1 from public.invites i
     where i.email_sent_at > now() - interval '60 seconds'
       and ((v.kind = 'student' and i.student_id = v.student_id and i.email = v.email)
         or (v.kind = 'teacher' and i.kind = 'teacher' and i.email = v.email))
  ) then
    raise exception 'too_many_emails';
  end if;

  update public.invites set email_sent_at = now() where id = v.id;
  select full_name into v_name from public.profiles where id = v.inviter_id;

  return jsonb_build_object('kind', v.kind, 'email', v.email, 'inviter_name', v_name);
end $$;

revoke all on function public.claim_invite_email(text) from public, anon;
grant execute on function public.claim_invite_email(text) to authenticated;
