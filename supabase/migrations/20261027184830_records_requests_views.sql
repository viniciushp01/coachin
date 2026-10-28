-- =====================================================================
-- Coach In · 0003 · Marcações, cargas, solicitações, aviso de treino novo
--                  e a lista de alunos do professor
-- Regras de produto: 9, 19 a 29, 37, 40, 43, 44, 52, 55, 62, 103, 106, 110,
--                    112, 116, 117
--
-- Todas as ações do aluno que podem ficar na fila offline (marcar, desfazer,
-- editar carga) são IDEMPOTENTES: reenviar a mesma ação não duplica nada
-- (client_action_id único) e o horário da AÇÃO (não o do envio) decide o
-- resultado (regra 116).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Treino feito (marcação): só ficha + data (regra 9 e glossário)
-- ---------------------------------------------------------------------
create table public.completions (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students (id) on delete cascade,
  workout_id       uuid not null references public.workouts (id) on delete cascade,
  day_id           uuid not null references public.workout_days (id) on delete cascade,
  done_on          date not null,
  marked_at        timestamptz not null,               -- quando o aluno fez a ação (pode ser offline)
  received_at      timestamptz not null default now(), -- quando o servidor recebeu
  client_action_id uuid not null unique,
  unique (student_id, day_id, done_on)                 -- marcar a mesma ficha no mesmo dia não duplica
);
create index completions_student_date_idx on public.completions (student_id, done_on desc);
create index completions_workout_idx on public.completions (workout_id);

-- ---------------------------------------------------------------------
-- Carga: por CONTA do aluno + exercício, compartilhada entre fichas, treinos
-- e professores (regras 26 a 29 e decisão de 27/10). Guarda também o nome do
-- exercício no histórico, como garantia.
-- ---------------------------------------------------------------------
create table public.student_exercise_loads (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  kg          numeric(6, 2) not null check (kg > 0 and kg <= 1000),
  edited_at   timestamptz not null,
  primary key (user_id, exercise_id)
);

create table public.load_history (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  exercise_id      uuid not null references public.exercises (id) on delete restrict,
  exercise_name    text not null,
  kg               numeric(6, 2) not null check (kg > 0 and kg <= 1000),
  edited_at        timestamptz not null,
  received_at      timestamptz not null default now(),
  client_action_id uuid not null unique
);
create index load_history_idx on public.load_history (user_id, exercise_id, edited_at desc);

-- ---------------------------------------------------------------------
-- Solicitação de novo treino (regras 37, 40, 52, 103)
-- Só 'open', 'canceled' e 'closed' são gravados. "Atendida" e "professor já
-- agiu" são DERIVADOS (private.request_state), sem rotina diária.
-- ---------------------------------------------------------------------
create type public.request_status as enum ('open', 'canceled', 'closed');

create table public.training_requests (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  status      public.request_status not null default 'open',
  created_at  timestamptz not null default now(),
  canceled_at timestamptz
);
create unique index training_requests_one_open
  on public.training_requests (student_id) where status = 'open';

-- 'fulfilled' = existe treino criado DEPOIS do pedido e já em vigor;
-- 'acted'     = existe treino criado depois do pedido, ainda agendado
--               (o professor já agiu: o aluno não cancela mais, regra 103);
-- 'open'      = ninguém agiu.
create or replace function private.request_state(
  p_student uuid, p_created timestamptz, p_status public.request_status
) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p_status = 'canceled' then 'canceled'
    when p_status = 'closed'   then 'closed'
    when exists (select 1 from public.workouts w
                  where w.student_id = p_student and w.created_at > p_created
                    and w.start_date <= private.student_today(p_student)) then 'fulfilled'
    when exists (select 1 from public.workouts w
                  where w.student_id = p_student and w.created_at > p_created) then 'acted'
    else 'open'
  end
$$;

-- Aviso "Seu treino novo chegou" (regra 117): uma vez por treino.
create table public.workout_seen (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  seen_at    timestamptz not null default now(),
  primary key (user_id, workout_id)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.completions             enable row level security;
alter table public.student_exercise_loads  enable row level security;
alter table public.load_history            enable row level security;
alter table public.training_requests       enable row level security;
alter table public.workout_seen            enable row level security;

create policy completions_select_teacher on public.completions
  for select to authenticated
  using (private.my_role() = 'professor'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.teacher_id = auth.uid() and s.status = 'active'));
create policy completions_select_student on public.completions
  for select to authenticated
  using (private.my_role() = 'aluno'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.user_id = auth.uid()));

-- Cargas: o aluno vê todas as dele. O professor vê as dos alunos ativos,
-- apenas de exercícios que ele próprio enxerga (pré-definidos ou criados por
-- ele): o professor novo não vê exercícios privados do antigo (decisão de 27/10).
create policy loads_select_student on public.student_exercise_loads
  for select to authenticated
  using (user_id = auth.uid() and private.my_role() = 'aluno');
create policy loads_select_teacher on public.student_exercise_loads
  for select to authenticated
  using (private.is_teacher_of_user(user_id)
         and exists (select 1 from public.exercises e where e.id = exercise_id));

create policy load_history_select_student on public.load_history
  for select to authenticated
  using (user_id = auth.uid() and private.my_role() = 'aluno');
create policy load_history_select_teacher on public.load_history
  for select to authenticated
  using (private.is_teacher_of_user(user_id)
         and exists (select 1 from public.exercises e where e.id = exercise_id));

create policy requests_select_teacher on public.training_requests
  for select to authenticated
  using (private.my_role() = 'professor'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.teacher_id = auth.uid() and s.status = 'active'));
create policy requests_select_student on public.training_requests
  for select to authenticated
  using (private.my_role() = 'aluno'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.user_id = auth.uid()));

create policy workout_seen_select_own on public.workout_seen
  for select to authenticated
  using (user_id = auth.uid() and private.my_role() = 'aluno');

revoke all on public.completions, public.student_exercise_loads, public.load_history,
              public.training_requests, public.workout_seen
  from anon, authenticated;
grant select on public.completions, public.student_exercise_loads, public.load_history,
                public.training_requests, public.workout_seen
  to authenticated;

-- ---------------------------------------------------------------------
-- Funções do aluno: marcar, desfazer, carga
-- ---------------------------------------------------------------------

-- Marcar ficha como feita (regras 19 a 24, 110, 116).
-- Só vale para o treino ATIVO (inclusive concluído) e para datas entre o
-- início dele e hoje (no fuso do aluno). Treinos encerrados: só consulta.
create or replace function public.mark_done(
  p_day_id uuid, p_done_on date, p_client_action_id uuid, p_client_ts timestamptz default now()
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_link  uuid;
  v_today date;
  v_day   public.workout_days%rowtype;
  v_w     public.workouts%rowtype;
  v_ts    timestamptz := least(coalesce(p_client_ts, now()), now());
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  v_link := private.my_active_link();
  if v_link is null then raise exception 'no_teacher_link'; end if;
  if p_client_action_id is null or p_done_on is null then raise exception 'invalid_arguments'; end if;

  select d.* into v_day from public.workout_days d
    join public.workouts w on w.id = d.workout_id
   where d.id = p_day_id and w.student_id = v_link;
  if not found then raise exception 'day_not_found'; end if;

  select * into v_w from public.workouts where id = v_day.workout_id;
  if v_w.id is distinct from private.current_workout_id(v_link) then
    raise exception 'workout_not_current';
  end if;
  -- ficha removida: só vale se a ação foi feita ANTES da remoção (fila offline, regra 116)
  if v_day.removed_at is not null and v_ts >= v_day.removed_at then
    raise exception 'day_removed';
  end if;

  v_today := private.student_today(v_link);
  if p_done_on > v_today or p_done_on < v_w.start_date then
    raise exception 'date_out_of_range';
  end if;

  insert into public.completions (student_id, workout_id, day_id, done_on, marked_at, client_action_id)
  values (v_link, v_w.id, p_day_id, p_done_on, v_ts, p_client_action_id)
  on conflict do nothing;
end $$;

create or replace function public.undo_done(p_day_id uuid, p_done_on date) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_link uuid;
  v_c    public.completions%rowtype;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  v_link := private.my_active_link();
  if v_link is null then raise exception 'no_teacher_link'; end if;

  select * into v_c from public.completions
   where student_id = v_link and day_id = p_day_id and done_on = p_done_on;
  if not found then return; end if;                       -- idempotente
  if v_c.workout_id is distinct from private.current_workout_id(v_link) then
    raise exception 'workout_not_current';
  end if;
  delete from public.completions where id = v_c.id;
end $$;

-- Editar carga (regras 26 a 29). A "última carga" é a de maior edited_at
-- (hora da ação, não a do envio): uma edição velha chegando atrasada da fila
-- entra no histórico mas não sobrescreve a mais nova.
create or replace function public.set_load(
  p_exercise_id uuid, p_kg numeric, p_client_action_id uuid, p_edited_at timestamptz default now()
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_ts   timestamptz := least(coalesce(p_edited_at, now()), now());
  v_rows integer;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  if private.my_active_link() is null then raise exception 'no_teacher_link'; end if;
  if p_client_action_id is null then raise exception 'invalid_arguments'; end if;
  if p_kg is null or p_kg <= 0 or p_kg > 1000 then raise exception 'load_invalid'; end if;

  select e.name into v_name from public.exercises e
   where e.id = p_exercise_id
     and exists (select 1 from public.workout_exercises we
                  join public.workout_days d on d.id = we.day_id
                  join public.workouts w on w.id = d.workout_id
                  join public.students s on s.id = w.student_id
                 where we.exercise_id = e.id and s.user_id = v_uid);
  if v_name is null then raise exception 'exercise_not_in_workout'; end if;

  insert into public.load_history (user_id, exercise_id, exercise_name, kg, edited_at, client_action_id)
  values (v_uid, p_exercise_id, v_name, p_kg, v_ts, p_client_action_id)
  on conflict (client_action_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return; end if;                      -- reenvio da mesma ação

  insert into public.student_exercise_loads as l (user_id, exercise_id, kg, edited_at)
  values (v_uid, p_exercise_id, p_kg, v_ts)
  on conflict (user_id, exercise_id) do update
    set kg = excluded.kg, edited_at = excluded.edited_at
    where l.edited_at <= excluded.edited_at;
end $$;

-- ---------------------------------------------------------------------
-- Funções do aluno: solicitação e aviso de treino novo
-- ---------------------------------------------------------------------
create or replace function public.request_new_workout() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_link uuid;
  v_id   uuid;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  v_link := private.my_active_link();
  if v_link is null then raise exception 'no_teacher_link'; end if;

  -- fecha pedidos já atendidos (o treino novo entrou em vigor)
  update public.training_requests r set status = 'closed'
   where r.student_id = v_link and r.status = 'open'
     and private.request_state(r.student_id, r.created_at, r.status) = 'fulfilled';

  if exists (select 1 from public.training_requests r
              where r.student_id = v_link and r.status = 'open') then
    raise exception 'request_already_open';
  end if;
  insert into public.training_requests (student_id) values (v_link) returning id into v_id;
  return v_id;
end $$;

-- Cancelar: só enquanto o professor ainda não agiu (regra 103).
create or replace function public.cancel_training_request() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_link uuid;
  v_r    public.training_requests%rowtype;
  v_state text;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  v_link := private.my_active_link();
  if v_link is null then raise exception 'no_teacher_link'; end if;

  select * into v_r from public.training_requests
   where student_id = v_link and status = 'open' for update;
  if not found then raise exception 'no_open_request'; end if;
  v_state := private.request_state(v_r.student_id, v_r.created_at, v_r.status);
  if v_state <> 'open' then raise exception 'professor_already_acted'; end if;
  update public.training_requests set status = 'canceled', canceled_at = now() where id = v_r.id;
end $$;

-- Pop-up "Seu treino novo chegou": o treino ativo que o aluno ainda não viu.
-- Não vale para EDIÇÃO do treino ativo (a chave é o id do treino, regra 112).
create or replace function public.pending_new_workout_notice() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_link uuid;
  v_wid  uuid;
  v_w    public.workouts%rowtype;
begin
  if private.my_role() is distinct from 'aluno' then return null; end if;
  v_link := private.my_active_link();
  if v_link is null then return null; end if;
  v_wid := private.current_workout_id(v_link);
  if v_wid is null then return null; end if;
  if exists (select 1 from public.workout_seen ws
              where ws.user_id = auth.uid() and ws.workout_id = v_wid) then
    return null;
  end if;
  select * into v_w from public.workouts where id = v_wid;
  return jsonb_build_object(
    'workout_id', v_w.id,
    'workout_name', v_w.name,
    'start_date', v_w.start_date,
    'teacher_name', (select p.full_name from public.profiles p where p.id = v_w.teacher_id));
end $$;

-- Marca este treino e os anteriores como vistos (vale só o mais recente).
create or replace function public.acknowledge_new_workout(p_workout_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_start date;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  select w.start_date into v_start
    from public.workouts w
    join public.students s on s.id = w.student_id
   where w.id = p_workout_id and s.user_id = v_uid;
  if v_start is null then raise exception 'workout_not_found'; end if;

  insert into public.workout_seen (user_id, workout_id)
  select v_uid, w.id
    from public.workouts w
    join public.students s on s.id = w.student_id
   where s.user_id = v_uid and w.start_date <= v_start
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------
-- Lista de alunos do professor (regras 34, 55, 56, 62, 102, 106):
-- status calculado no servidor, no fuso de cada aluno. security_invoker:
-- vale a RLS de quem consulta (cada professor só vê os próprios alunos).
-- ---------------------------------------------------------------------
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
  lastc.last_done_on
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
  select max(c.done_on) as last_done_on from public.completions c where c.student_id = s.id
) lastc on true;

revoke all on public.teacher_student_list from anon, authenticated;
grant select on public.teacher_student_list to authenticated;

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------
revoke all on function public.mark_done(uuid, date, uuid, timestamptz) from public, anon;
grant execute on function public.mark_done(uuid, date, uuid, timestamptz) to authenticated;
revoke all on function public.undo_done(uuid, date) from public, anon;
grant execute on function public.undo_done(uuid, date) to authenticated;
revoke all on function public.set_load(uuid, numeric, uuid, timestamptz) from public, anon;
grant execute on function public.set_load(uuid, numeric, uuid, timestamptz) to authenticated;
revoke all on function public.request_new_workout() from public, anon;
grant execute on function public.request_new_workout() to authenticated;
revoke all on function public.cancel_training_request() from public, anon;
grant execute on function public.cancel_training_request() to authenticated;
revoke all on function public.pending_new_workout_notice() from public, anon;
grant execute on function public.pending_new_workout_notice() to authenticated;
revoke all on function public.acknowledge_new_workout(uuid) from public, anon;
grant execute on function public.acknowledge_new_workout(uuid) to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
