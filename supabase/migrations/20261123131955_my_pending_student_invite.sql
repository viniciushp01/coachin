-- =====================================================================
-- Coach In · 0018 · Convite pendente do e-mail da conta (regra 173, #157)
--
-- Aluno com e-mail confirmado e sem professor vê "Vincular ao professor?"
-- quando existe convite de aluno pendente para o e-mail da própria conta,
-- mesmo sem o link. O app não tem o token (só o hash é gravado), então aqui o
-- convite é lido, aceito e recusado POR ID, e o que autoriza é o e-mail
-- confirmado em auth.users ser o do convite.
--
-- accept_student_invite muda só por dentro: a conferência da conta e o vínculo
-- saíram para funções private.*, na mesma ordem e com os mesmos códigos de
-- erro. get_invite_preview, decline_invite e as políticas não mudam.
-- =====================================================================

-- Conta que pode aceitar convite de aluno: logada, não bloqueada, aluno e com
-- e-mail confirmado (regra 89). Devolve o id da conta.
create or replace function private.require_confirmed_student() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_prof public.profiles%rowtype;
  v_conf timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_prof from public.profiles where id = v_uid;
  if v_prof.status = 'blocked' then raise exception 'account_blocked'; end if;
  if v_prof.role <> 'aluno' then raise exception 'role_not_allowed'; end if;
  select u.email_confirmed_at into v_conf from auth.users u where u.id = v_uid;
  if v_conf is null then raise exception 'email_not_confirmed'; end if;
  return v_uid;
end $$;

-- Vincula a conta pelo convite, que quem chama já leu com "for update"
-- (regras 79, 97, 98 e 133).
create or replace function private.link_student_by_invite(
  p_uid uuid, p_invite public.invites, p_confirm_switch boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_state  text;
  v_st     public.students%rowtype;
  v_cur    public.students%rowtype;
  v_teacher_status public.account_status;
begin
  v_state := private.invite_state(p_invite.status, p_invite.expires_at);
  if v_state = 'replaced' then raise exception 'invite_replaced'; end if;
  if v_state = 'accepted' then raise exception 'invite_used'; end if;
  if v_state = 'declined' then raise exception 'invite_declined'; end if;
  if v_state = 'expired'  then raise exception 'invite_expired'; end if;

  select * into v_st from public.students where id = p_invite.student_id for update;
  if v_st.status <> 'invited' then raise exception 'invite_used'; end if;
  select p.status into v_teacher_status from public.profiles p where p.id = v_st.teacher_id;
  if v_teacher_status <> 'active' then raise exception 'teacher_unavailable'; end if;

  select * into v_cur from public.students
   where user_id = p_uid and status = 'active' for update;
  if found then
    if v_cur.teacher_id = v_st.teacher_id then raise exception 'already_linked'; end if;
    if not coalesce(p_confirm_switch, false) then raise exception 'switch_requires_confirmation'; end if;
    update public.students
       set status = 'archived', archived_at = now(), archive_reason = 'teacher_switch'
     where id = v_cur.id;
  end if;

  update public.students
     set user_id = p_uid, status = 'active', linked_at = now()
   where id = v_st.id;
  update public.invites
     set status = 'accepted', accepted_at = now(), accepted_by = p_uid
   where id = p_invite.id;

  return jsonb_build_object(
    'student_id', v_st.id,
    'teacher_id', v_st.teacher_id,
    'switched', v_cur.id is not null,
    'needs_first_access', not exists (
        select 1 from public.student_profiles sp
         where sp.user_id = p_uid and sp.completed_at is not null)
  );
end $$;

create or replace function public.accept_student_invite(p_token text, p_confirm_switch boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := private.require_confirmed_student();
  v     public.invites%rowtype;
begin
  select * into v from public.invites
   where token_hash = private.hash_token(p_token) and kind = 'student' for update;
  if not found then raise exception 'invite_invalid'; end if;
  return private.link_student_by_invite(v_uid, v, p_confirm_switch);
end $$;

-- E-mail confirmado da conta, normalizado; nulo se não houver (e nulo não casa
-- com convite nenhum). Vem de auth.users, não de profiles.
create or replace function private.my_confirmed_email() returns text
language sql stable security definer set search_path = public as $$
  select private.norm_email(u.email) from auth.users u
   where u.id = auth.uid() and u.email_confirmed_at is not null
$$;

-- Convite de aluno da conta, travado. De outro e-mail ou inexistente dão o
-- mesmo erro, para não dizer se o id existe.
create or replace function private.lock_my_student_invite(p_invite_id uuid) returns public.invites
language plpgsql security definer set search_path = public as $$
declare
  v public.invites%rowtype;
begin
  select * into v from public.invites i
   where i.id = p_invite_id and i.kind = 'student'
     and private.norm_email(i.email) = private.my_confirmed_email()
   for update;
  if not found then raise exception 'invite_invalid'; end if;
  return v;
end $$;

-- Convite pendente mais recente para o e-mail da conta, ou nulo. Quem já tem
-- professor segue só pelo link (regra 98).
create or replace function public.my_pending_student_invite() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := private.require_confirmed_student();
  v     jsonb;
begin
  if exists (select 1 from public.students s where s.user_id = v_uid and s.status = 'active') then
    return null;
  end if;
  select jsonb_build_object(
           'invite_id', i.id,
           'inviter_name', pi.full_name,
           'state', case when pt.status = 'active' then 'valid' else 'teacher_unavailable' end)
    into v
    from public.invites i
    join public.students s  on s.id = i.student_id and s.status = 'invited'
    join public.profiles pi on pi.id = i.inviter_id
    join public.profiles pt on pt.id = s.teacher_id
   where i.kind = 'student'
     and private.norm_email(i.email) = private.my_confirmed_email()
     and private.invite_state(i.status, i.expires_at) = 'pending'
   order by i.created_at desc, i.id
   limit 1;
  return v;
end $$;

create or replace function public.accept_my_student_invite(p_invite_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.require_confirmed_student();
begin
  -- Sem troca de professor por aqui: quem já tem professor usa o link (regra 98).
  return private.link_student_by_invite(v_uid, private.lock_my_student_invite(p_invite_id), false);
end $$;

-- "Agora não" (regra 102).
create or replace function public.decline_my_student_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := private.require_confirmed_student();
  v     public.invites%rowtype;
begin
  v := private.lock_my_student_invite(p_invite_id);
  if private.invite_state(v.status, v.expires_at) <> 'pending' then
    raise exception 'invite_not_pending';
  end if;
  if exists (select 1 from public.students s where s.user_id = v_uid and s.status = 'active') then
    raise exception 'forbidden';
  end if;
  update public.invites set status = 'declined', declined_at = now() where id = v.id;
end $$;

-- As partes comuns só rodam por dentro das funções acima.
revoke all on function private.require_confirmed_student() from public, anon, authenticated;
revoke all on function private.link_student_by_invite(uuid, public.invites, boolean) from public, anon, authenticated;
revoke all on function private.my_confirmed_email() from public, anon, authenticated;
revoke all on function private.lock_my_student_invite(uuid) from public, anon, authenticated;

revoke all on function public.my_pending_student_invite() from public, anon;
revoke all on function public.accept_my_student_invite(uuid) from public, anon;
revoke all on function public.decline_my_student_invite(uuid) from public, anon;
grant execute on function public.my_pending_student_invite() to authenticated;
grant execute on function public.accept_my_student_invite(uuid) to authenticated;
grant execute on function public.decline_my_student_invite(uuid) to authenticated;
