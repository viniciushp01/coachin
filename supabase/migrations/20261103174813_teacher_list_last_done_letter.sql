-- =====================================================================
-- 0010 · Lista de alunos: ficha do último treino (regra 147 (1), #79)
-- =====================================================================
-- "Último treino em 27/10 · Ficha B" ("Professor · Alunos", Lista · 1).
-- Só a view teacher_student_list muda: coluna nova last_done_letter no fim
-- (nenhuma sai nem muda de nome). É a letra da ficha da marcação mais
-- recente do aluno; com duas marcações no mesmo dia, a de marked_at mais
-- recente. last_done_on passa a vir da mesma marcação (mesmo valor de antes,
-- o max(done_on)). Continua security_invoker: vale a RLS de quem consulta.
-- =====================================================================

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
      case inv.state when 'expired'  then 'convite_expirado'
                     when 'declined' then 'convite_recusado'
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
