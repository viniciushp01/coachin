-- =====================================================================
-- Envio do convite por e-mail (issue #52, regras 136, 139 e 140).
-- A Edge Function `enviar-convite` chama claim_invite_email com o token,
-- como quem pediu o envio (o JWT do app segue na chamada). A função confere
-- tudo no banco e só então a Edge Function envia, ao e-mail do convite.
-- =====================================================================

-- Último envio por e-mail. O app lê para mostrar "Reenviar em N s" (regra 139).
alter table public.invites add column email_sent_at timestamptz;

-- Houve envio por e-mail à mesma pessoa nos últimos 60 s? Reenviar cria um convite novo, por
-- isso olha os convites do mesmo aluno e e-mail (ou do mesmo e-mail de professor).
create or replace function private.invite_email_recent(
  p_kind public.invite_kind, p_student uuid, p_email text
) returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.invites i
     where i.email_sent_at > now() - interval '60 seconds'
       and i.email = p_email
       and ((p_kind = 'student' and i.student_id = p_student)
         or (p_kind = 'teacher' and i.kind = 'teacher'))
  )
$$;

-- reissue_invite de 20261027184620, com a recusa do intervalo de 60 s antes de trocar o link.
create or replace function public.reissue_invite(p_invite_id uuid, p_new_email text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v       public.invites%rowtype;
  v_state text;
  v_email text := private.norm_email(p_new_email);
  v_st    public.students%rowtype;
  v_ttl   interval;
  v_token text := private.new_token();
  v_id    uuid;
  v_exp   timestamptz;
  v_target_email text;
begin
  select * into v from public.invites where id = p_invite_id for update;
  if not found then raise exception 'invite_not_found'; end if;
  if v_email is not null and not private.email_valid(v_email) then raise exception 'email_invalid'; end if;
  v_state := private.invite_state(v.status, v.expires_at);

  if v.kind = 'student' then
    if private.my_role() is distinct from 'professor' or v.inviter_id <> v_uid then
      raise exception 'forbidden';
    end if;
    select * into v_st from public.students where id = v.student_id for update;
    if v_st.status <> 'invited' then raise exception 'student_already_linked'; end if;
    v_ttl := interval '7 days';
    v_target_email := coalesce(v_email, v.email);
  else
    if private.my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
    v_ttl := interval '1 day';
    v_target_email := coalesce(v_email, v.email);
  end if;

  if v_state = 'accepted' then raise exception 'invite_used'; end if;
  if v_state = 'replaced' then raise exception 'invite_replaced'; end if;
  -- Regra 139: enviado há menos de 60 s, recusa antes de trocar o link (senão o link que acabou
  -- de ir por e-mail morreria e o envio do novo seria recusado). Corrigir o e-mail não espera.
  if private.invite_email_recent(v.kind, v.student_id, v_target_email) then
    raise exception 'too_many_emails';
  end if;

  if v_email is not null and v_email is distinct from v.email then
    if v.kind = 'student' then
      if exists (select 1 from public.students s
                  where s.teacher_id = v_uid and s.email = v_email
                    and s.status <> 'archived' and s.id <> v_st.id) then
        raise exception 'student_email_taken';
      end if;
      update public.students set email = v_email where id = v_st.id;
    else
      if exists (select 1 from public.profiles p where p.email = v_email and p.role = 'admin') then
        raise exception 'email_is_admin';
      end if;
      if exists (select 1 from public.profiles p where p.email = v_email and p.role = 'professor') then
        raise exception 'already_teacher';
      end if;
    end if;
  end if;

  -- pendente ou vencido: o link antigo deixa de valer. Recusado fica como
  -- histórico ("Recusou o convite em dd/mm").
  if v_state in ('pending', 'expired') then
    update public.invites set status = 'replaced', replaced_at = now() where id = v.id;
  end if;

  v_exp := now() + v_ttl;
  insert into public.invites (kind, token_hash, inviter_id, student_id, email, invitee_name, expires_at)
  values (v.kind, private.hash_token(v_token), v.inviter_id, v.student_id,
          v_target_email, v.invitee_name, v_exp)
  returning id into v_id;

  return jsonb_build_object('invite_id', v_id, 'token', v_token, 'expires_at', v_exp);
end $$;

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

  if v.kind = 'student' and not exists (
    select 1 from public.students s where s.id = v.student_id and s.status = 'invited'
  ) then
    raise exception 'student_already_linked';
  end if;
  if private.invite_email_recent(v.kind, v.student_id, v.email) then
    raise exception 'too_many_emails';
  end if;

  update public.invites set email_sent_at = now() where id = v.id;
  select full_name into v_name from public.profiles where id = v.inviter_id;

  return jsonb_build_object('kind', v.kind, 'email', v.email, 'inviter_name', v_name);
end $$;

revoke all on function private.invite_email_recent(public.invite_kind, uuid, text) from public, anon;
revoke all on function public.claim_invite_email(text) from public, anon;
grant execute on function public.claim_invite_email(text) to authenticated;
