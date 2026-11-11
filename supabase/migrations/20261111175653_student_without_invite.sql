-- =====================================================================
-- 0015 · Cadastrar o aluno sem convite; enviar o convite depois (regra 164, #135)
-- =====================================================================
-- 1. create_student: cria só o aluno (vínculo 'invited', sem linha em
--    invites). Mesmas validações de create_student_with_invite, que fica
--    como está (testes e histórico); o app passa a usar esta.
-- 2. send_student_invite: gera o PRIMEIRO convite de um aluno sem convite.
--    Vale 7 dias a partir daqui (regra 58), e o intervalo de 60 s da regra
--    139 conta do envio por e-mail desse convite (claim_invite_email, sem
--    mudança). Para reenviar, segue reissue_invite.
-- 3. teacher_student_list: list_status 'sem_convite' para o vínculo
--    'invited' sem nenhum convite. Mesmas colunas, na mesma ordem.
-- save_workout e a leitura de treinos já aceitam vínculo 'invited' (0006,
-- regra 122) e não olham o convite: valem sem convite algum.
-- =====================================================================

create or replace function public.create_student(
  p_name text, p_email text default null, p_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text := btrim(coalesce(p_name, ''));
  v_email text := private.norm_email(p_email);
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_student uuid;
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if v_email is not null and not private.email_valid(v_email) then raise exception 'email_invalid'; end if;
  if v_phone is not null and not private.phone_valid(v_phone) then raise exception 'phone_invalid'; end if;
  if v_email is not null and exists (
       select 1 from public.students s
        where s.teacher_id = v_uid and s.email = v_email and s.status <> 'archived') then
    raise exception 'student_email_taken';
  end if;

  insert into public.students (teacher_id, name, email, phone)
  values (v_uid, v_name, v_email, v_phone) returning id into v_student;

  return jsonb_build_object('student_id', v_student);
end $$;

create or replace function public.send_student_invite(p_student_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_st    public.students%rowtype;
  v_token text := private.new_token();
  v_inv   uuid;
  v_exp   timestamptz := now() + interval '7 days';
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  select * into v_st from public.students
   where id = p_student_id and teacher_id = v_uid and status <> 'archived' for update;
  if not found then raise exception 'student_not_found'; end if;
  if v_st.status <> 'invited' then raise exception 'student_already_linked'; end if;
  -- Já tem convite (de antes da regra 164 ou de um envio anterior): reenviar é reissue_invite.
  if exists (select 1 from public.invites i where i.student_id = v_st.id) then
    raise exception 'invite_already_sent';
  end if;

  insert into public.invites (kind, token_hash, inviter_id, student_id, email, expires_at)
  values ('student', private.hash_token(v_token), v_uid, v_st.id, v_st.email, v_exp)
  returning id into v_inv;

  return jsonb_build_object('invite_id', v_inv, 'token', v_token, 'expires_at', v_exp);
end $$;

revoke all on function public.create_student(text, text, text) from public, anon;
revoke all on function public.send_student_invite(uuid) from public, anon;
grant execute on function public.create_student(text, text, text) to authenticated;
grant execute on function public.send_student_invite(uuid) to authenticated;

-- teacher_student_list de 20261103174813; muda só o list_status do vínculo 'invited'.
create or replace view public.teacher_student_list
with (security_invoker = true) as
select
  s.id                  as student_id,
  s.teacher_id,
  s.user_id,
  s.name,
  s.email,
  s.phone,
  s.status              as link_status,
  case
    when s.status = 'invited' then
      case when inv.id is null then 'sem_convite'                    -- regra 164
           when inv.state = 'expired'  then 'convite_expirado'
           when inv.state = 'declined' then 'convite_recusado'
           else 'convite_pendente' end
    when cw.id is null then 'sem_treino'
    when cw.end_date >= t.today and cw.end_date - t.today <= 7 then 'quase_no_fim'
    else 'ativo'
  end                   as list_status,
  inv.id                as invite_id,
  inv.state             as invite_state,
  inv.expires_at        as invite_expires_at,
  inv.declined_at       as invite_declined_at,
  cw.id                 as current_workout_id,
  cw.name               as current_workout_name,
  cw.start_date         as current_start_date,
  cw.end_date           as current_end_date,
  coalesce(cw.end_date < t.today, false) as current_concluded,
  sw.id                 as scheduled_workout_id,
  sw.start_date         as scheduled_start_date,
  coalesce(req.state in ('open', 'acted'), false) as has_open_request,
  coalesce(req.state = 'open', false)             as request_cancelable,
  req.created_at        as request_created_at,
  lastc.last_done_on,
  lastc.last_done_letter
from public.students s
cross join lateral (select private.student_today(s.id) as today) t
left join lateral (
  select i.id, private.invite_state(i.status, i.expires_at) as state, i.expires_at, i.declined_at
    from public.invites i where i.student_id = s.id
   order by i.created_at desc limit 1
) inv on true
left join lateral (
  select w.* from public.workouts w
   where w.student_id = s.id and w.start_date <= t.today
   order by w.start_date desc limit 1
) cw on true
left join lateral (
  select w.* from public.workouts w
   where w.student_id = s.id and w.start_date > t.today
   order by w.start_date limit 1
) sw on true
left join lateral (
  select r.created_at, private.request_state(r.student_id, r.created_at, r.status) as state
    from public.training_requests r
   where r.student_id = s.id and r.status = 'open'
) req on true
left join lateral (
  select c.done_on as last_done_on, d.letter as last_done_letter
    from public.completions c
    join public.workout_days d on d.id = c.day_id
   where c.student_id = s.id
   order by c.done_on desc, c.marked_at desc limit 1
) lastc on true;

revoke all on public.teacher_student_list from anon, authenticated;
grant select on public.teacher_student_list to authenticated;
