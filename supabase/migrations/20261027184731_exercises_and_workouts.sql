-- =====================================================================
-- Coach In · 0002 · Biblioteca de exercícios e treinos
-- Regras de produto: 1 a 8, 30 a 32, 64 a 67, 73 a 77, 104 a 107, 110 a 113, 115, 118
--
-- Decisões de modelagem:
--  * O estado do treino (agendado / ativo / concluído / encerrado) é DERIVADO
--    das datas, no fuso do aluno. Não existe coluna "status" nem rotina diária.
--      ativo     = o treino de maior start_date com start_date <= hoje
--      agendado  = start_date > hoje (no máximo um por aluno)
--      concluído = o ativo cuja end_date < hoje (segue ativo, regra 43)
--      encerrado = qualquer outro com start_date <= hoje
--  * Datas de treino são DATE (sem hora) (regra 115).
--  * Fichas têm letra FIXA, nunca reaproveitada (regra 111); remover uma
--    ficha é lógico (removed_at) para o calendário do aluno manter o nome.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Exercícios (regras 30 a 32, 36)
-- ---------------------------------------------------------------------
create or replace function private.normalize_name(p text) returns text
language sql stable as $$
  select lower(extensions.unaccent(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')))
$$;

create table public.exercises (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.profiles (id) on delete restrict, -- NULL = pré-definido
  name            text not null check (length(btrim(name)) between 1 and 120),
  name_normalized text not null,
  muscle_group    text,
  created_at      timestamptz not null default now()
);
create unique index exercises_predefined_name_key
  on public.exercises (name_normalized) where owner_id is null;
create unique index exercises_owner_name_key
  on public.exercises (owner_id, name_normalized) where owner_id is not null;
create index exercises_name_trgm_idx
  on public.exercises using gin (name_normalized extensions.gin_trgm_ops);

create or replace function private.exercises_normalize() returns trigger
language plpgsql as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.name_normalized := private.normalize_name(new.name);
  return new;
end $$;
create trigger exercises_normalize before insert or update of name on public.exercises
  for each row execute function private.exercises_normalize();

-- Exercícios nunca são excluídos (regra 31): nenhuma permissão de DELETE,
-- e o bloqueio abaixo vale até para quem for dono da tabela.
create or replace function private.exercises_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'exercises_are_permanent';
end $$;
create trigger exercises_no_delete before delete on public.exercises
  for each row execute function private.exercises_no_delete();

-- "Ocultar da busca" vale só para quem ocultou (regras 32 e 36).
create table public.exercise_hidden (
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  hidden_at   timestamptz not null default now(),
  primary key (teacher_id, exercise_id)
);

-- ---------------------------------------------------------------------
-- Treino > Ficha > Exercício
-- ---------------------------------------------------------------------
create or replace function private.letter_for(n int) returns text
language plpgsql immutable as $$
declare
  s text := '';
  x int := n;
begin
  loop
    s := chr(65 + (x % 26)) || s;
    x := x / 26 - 1;
    exit when x < 0;
  end loop;
  return s;
end $$;

create table public.workouts (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null,
  teacher_id          uuid not null,
  name                text not null check (length(btrim(name)) > 0),
  start_date          date not null,
  weeks               integer not null check (weeks >= 1),
  end_date            date generated always as (start_date + (weeks * 7 - 1)) stored,
  suggested_frequency text,
  letters_used        integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (student_id, teacher_id)
    references public.students (id, teacher_id) on delete cascade,
  unique (student_id, start_date)
);
create index workouts_student_start_idx on public.workouts (student_id, start_date desc);
create trigger workouts_touch before update on public.workouts
  for each row execute function private.touch_updated_at();

create table public.workout_days (
  id         uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  letter     text not null,
  name       text not null check (length(btrim(name)) > 0),
  position   integer not null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workout_id, letter)
);
create index workout_days_workout_idx on public.workout_days (workout_id, position);

create table public.workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references public.workout_days (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete restrict,
  position     integer not null,
  sets         integer not null check (sets >= 1),
  reps         text not null check (length(btrim(reps)) > 0),
  rest_seconds integer not null default 0 check (rest_seconds >= 0),
  note         text
);
create index workout_exercises_day_idx on public.workout_exercises (day_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

-- ---------------------------------------------------------------------
-- Helpers de estado do treino
-- ---------------------------------------------------------------------
create or replace function private.current_workout_id(p_student uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select w.id from public.workouts w
   where w.student_id = p_student and w.start_date <= private.student_today(p_student)
   order by w.start_date desc limit 1
$$;

create or replace function private.scheduled_workout_id(p_student uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select w.id from public.workouts w
   where w.student_id = p_student and w.start_date > private.student_today(p_student)
   order by w.start_date limit 1
$$;

-- Exercícios que o aluno pode ler: os dos treinos dele (inclusive de
-- professores antigos) e os que tem em histórico de carga. Definido em
-- plpgsql para referenciar load_history, criada na migration 0003.
create or replace function private.student_can_see_exercise(p_exercise uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return exists (
           select 1
             from public.workout_exercises we
             join public.workout_days d on d.id = we.day_id
             join public.workouts w on w.id = d.workout_id
             join public.students s on s.id = w.student_id
            where s.user_id = auth.uid() and we.exercise_id = p_exercise)
      or exists (
           select 1 from public.load_history h
            where h.user_id = auth.uid() and h.exercise_id = p_exercise);
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.exercises         enable row level security;
alter table public.exercise_hidden   enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_days      enable row level security;
alter table public.workout_exercises enable row level security;

-- Pré-definidos: todos. Criados: só o dono. Aluno: também os que aparecem
-- nos treinos/cargas dele, mesmo de professor antigo (decisão de 27/10).
create policy exercises_select on public.exercises
  for select to authenticated
  using (
    private.my_role() is not null
    and (owner_id is null
         or owner_id = auth.uid()
         or (private.my_role() = 'aluno' and private.student_can_see_exercise(id)))
  );

create policy exercise_hidden_select_own on public.exercise_hidden
  for select to authenticated
  using (teacher_id = auth.uid() and private.my_role() = 'professor');

-- Treinos: o professor vê os dos alunos ATIVOS dele; o aluno vê os próprios
-- (inclusive de vínculos arquivados), mas o agendado só o professor vê
-- (regra 2).
create policy workouts_select_teacher on public.workouts
  for select to authenticated
  using (
    private.my_role() = 'professor' and teacher_id = auth.uid()
    and exists (select 1 from public.students s
                 where s.id = student_id and s.status = 'active')
  );
create policy workouts_select_student on public.workouts
  for select to authenticated
  using (
    private.my_role() = 'aluno'
    and exists (select 1 from public.students s
                 where s.id = student_id and s.user_id = auth.uid())
    and start_date <= private.user_today(auth.uid())
  );

create policy workout_days_select on public.workout_days
  for select to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id));

create policy workout_exercises_select on public.workout_exercises
  for select to authenticated
  using (exists (select 1 from public.workout_days d where d.id = day_id));

revoke all on public.exercises, public.exercise_hidden, public.workouts,
              public.workout_days, public.workout_exercises
  from anon, authenticated;
grant select on public.exercises, public.exercise_hidden, public.workouts,
                public.workout_days, public.workout_exercises
  to authenticated;

-- ---------------------------------------------------------------------
-- Funções: biblioteca
-- ---------------------------------------------------------------------

-- Busca com acento/caixa ignorados. p_hidden_only = lista "Exercícios ocultos".
create or replace function public.search_exercises(
  p_query text default '', p_hidden_only boolean default false, p_limit integer default 30
) returns setof public.exercises
language sql stable security invoker set search_path = public, extensions as $$
  select e.*
    from (select private.normalize_name(p_query) as n) q
    cross join public.exercises e
   where private.my_role() = 'professor'
     and (case when p_hidden_only
               then exists (select 1 from public.exercise_hidden h
                             where h.teacher_id = auth.uid() and h.exercise_id = e.id)
               else not exists (select 1 from public.exercise_hidden h
                                 where h.teacher_id = auth.uid() and h.exercise_id = e.id)
          end)
     and (q.n = ''
          or strpos(e.name_normalized, q.n) > 0
          or extensions.similarity(e.name_normalized, q.n) > 0.3)
   order by (left(e.name_normalized, length(q.n)) = q.n) desc,
            extensions.similarity(e.name_normalized, q.n) desc,
            e.name_normalized
   limit greatest(least(coalesce(p_limit, 30), 100), 1)
$$;

-- "Já existe um exercício parecido" (regra 74).
create or replace function public.similar_exercises(p_name text) returns setof public.exercises
language sql stable security invoker set search_path = public, extensions as $$
  select e.*
    from (select private.normalize_name(p_name) as n) q
    cross join public.exercises e
   where private.my_role() = 'professor'
     and q.n <> ''
     and (extensions.similarity(e.name_normalized, q.n) > 0.45
          or strpos(e.name_normalized, q.n) > 0
          or strpos(q.n, e.name_normalized) > 0)
   order by extensions.similarity(e.name_normalized, q.n) desc
   limit 5
$$;

create or replace function public.create_exercise(p_name text, p_muscle_group text default null)
returns public.exercises
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_row public.exercises;
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if length(v_name) > 120 then raise exception 'name_too_long'; end if;
  if exists (select 1 from public.exercises e
              where e.name_normalized = private.normalize_name(v_name)
                and (e.owner_id is null or e.owner_id = v_uid)) then
    raise exception 'exercise_exists';
  end if;
  insert into public.exercises (owner_id, name, muscle_group)
  values (v_uid, v_name, nullif(btrim(coalesce(p_muscle_group, '')), ''))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.set_exercise_hidden(p_exercise_id uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.exercises e
                  where e.id = p_exercise_id and (e.owner_id is null or e.owner_id = v_uid)) then
    raise exception 'exercise_not_found';
  end if;
  if p_hidden then
    insert into public.exercise_hidden (teacher_id, exercise_id)
    values (v_uid, p_exercise_id) on conflict do nothing;
  else
    delete from public.exercise_hidden
     where teacher_id = v_uid and exercise_id = p_exercise_id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Funções: treino
-- ---------------------------------------------------------------------

-- Salva o treino INTEIRO de uma vez (regra 107: só grava em "Salvar treino").
-- Cria quando p_workout_id é nulo; edita caso contrário (ativo ou agendado).
--
-- p_data = {
--   "name": "Hipertrofia A", "start_date": "2026-11-03", "weeks": 8,
--   "suggested_frequency": "5x por semana",          -- opcional
--   "days": [                                         -- a ordem do array é a ordem das fichas
--     { "id": "<uuid da ficha ou null>", "name": "Peito e tríceps",
--       "exercises": [ { "exercise_id": "<uuid>", "sets": 4, "reps": "10",
--                        "rest_seconds": 90, "note": null } ] }
--   ]
-- }
-- Devolve o id do treino.
create or replace function public.save_workout(p_student_id uuid, p_workout_id uuid, p_data jsonb)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid     uuid := auth.uid();
  v_student public.students%rowtype;
  v_today   date;
  v_name    text := nullif(btrim(coalesce(p_data ->> 'name', '')), '');
  v_freq    text := nullif(btrim(coalesce(p_data ->> 'suggested_frequency', '')), '');
  v_start   date;
  v_weeks   integer;
  v_days    jsonb := p_data -> 'days';
  v_w       public.workouts%rowtype;
  v_wid     uuid;
  v_day     jsonb;
  v_ex      jsonb;
  v_day_id  uuid;
  v_idx     integer := 0;
  v_pos     integer;
  v_letter  text;
  v_keep    uuid[] := '{}';
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;

  select * into v_student from public.students
   where id = p_student_id and teacher_id = v_uid and status = 'active' for update;
  if not found then raise exception 'student_not_found'; end if;
  v_today := private.student_today(p_student_id);

  -- Validação (regras 73, 104, 105)
  if v_name is null then raise exception 'workout_name_required'; end if;
  if coalesce(p_data ->> 'weeks', '') !~ '^[0-9]+$' or (p_data ->> 'weeks')::int < 1 then
    raise exception 'weeks_invalid';
  end if;
  v_weeks := (p_data ->> 'weeks')::int;
  begin
    v_start := (p_data ->> 'start_date')::date;
  exception when others then
    raise exception 'start_date_invalid';
  end;
  if v_start is null then raise exception 'start_date_invalid'; end if;

  if v_days is null or jsonb_typeof(v_days) <> 'array' or jsonb_array_length(v_days) = 0 then
    raise exception 'workout_needs_day';
  end if;
  for v_day in select * from jsonb_array_elements(v_days) loop
    if nullif(btrim(coalesce(v_day ->> 'name', '')), '') is null then raise exception 'day_name_required'; end if;
    if jsonb_typeof(v_day -> 'exercises') is distinct from 'array'
       or jsonb_array_length(v_day -> 'exercises') = 0 then
      raise exception 'day_needs_exercise';
    end if;
    for v_ex in select * from jsonb_array_elements(v_day -> 'exercises') loop
      if coalesce(v_ex ->> 'exercise_id', '') !~* '^[0-9a-f-]{36}$' then raise exception 'exercise_not_found'; end if;
      if not exists (select 1 from public.exercises e
                      where e.id = (v_ex ->> 'exercise_id')::uuid
                        and (e.owner_id is null or e.owner_id = v_uid)) then
        raise exception 'exercise_not_found';
      end if;
      if coalesce(v_ex ->> 'sets', '') !~ '^[0-9]+$' or (v_ex ->> 'sets')::int < 1 then raise exception 'sets_invalid'; end if;
      if nullif(btrim(coalesce(v_ex ->> 'reps', '')), '') is null then raise exception 'reps_invalid'; end if;
      if coalesce(v_ex ->> 'rest_seconds', '0') !~ '^[0-9]+$' then raise exception 'rest_invalid'; end if;
    end loop;
  end loop;

  if p_workout_id is null then
    ------------------------------------------------------------------
    -- CRIAR
    ------------------------------------------------------------------
    if v_start < v_today then raise exception 'start_in_past'; end if;
    if v_start > v_today and exists (
         select 1 from public.workouts w
          where w.student_id = p_student_id and w.start_date > v_today) then
      raise exception 'scheduled_exists';            -- regras 64 e 106
    end if;
    if exists (select 1 from public.workouts w
                where w.student_id = p_student_id and w.start_date = v_start) then
      raise exception 'start_date_taken';
    end if;
    insert into public.workouts (student_id, teacher_id, name, start_date, weeks, suggested_frequency)
    values (p_student_id, v_uid, v_name, v_start, v_weeks, v_freq)
    returning * into v_w;
  else
    ------------------------------------------------------------------
    -- EDITAR (agendado ou ativo)
    ------------------------------------------------------------------
    select * into v_w from public.workouts
     where id = p_workout_id and student_id = p_student_id for update;
    if not found then raise exception 'workout_not_found'; end if;

    if v_w.start_date > v_today then
      -- agendado: pode mudar início e semanas; mudar para hoje ativa na hora (regra 106)
      if v_start < v_today then raise exception 'start_in_past'; end if;
      if exists (select 1 from public.workouts w
                  where w.student_id = p_student_id and w.start_date = v_start and w.id <> v_w.id) then
        raise exception 'start_date_taken';
      end if;
    else
      if p_workout_id is distinct from private.current_workout_id(p_student_id) then
        raise exception 'workout_not_editable';       -- encerrado: só consulta
      end if;
      if v_start <> v_w.start_date or v_weeks <> v_w.weeks then
        raise exception 'active_workout_dates_locked'; -- início e fim são fixos (regra 6)
      end if;
    end if;

    update public.workouts
       set name = v_name, start_date = v_start, weeks = v_weeks, suggested_frequency = v_freq
     where id = v_w.id
    returning * into v_w;
  end if;
  v_wid := v_w.id;

  ------------------------------------------------------------------
  -- Fichas e exercícios
  ------------------------------------------------------------------
  v_pos := 0;
  for v_day in select * from jsonb_array_elements(v_days) loop
    v_pos := v_pos + 1;
    if nullif(v_day ->> 'id', '') is not null then
      v_day_id := (v_day ->> 'id')::uuid;
      if not exists (select 1 from public.workout_days d
                      where d.id = v_day_id and d.workout_id = v_wid and d.removed_at is null) then
        raise exception 'day_not_found';
      end if;
      update public.workout_days
         set name = btrim(v_day ->> 'name'), position = v_pos
       where id = v_day_id;
    else
      -- ficha nova: ganha a próxima letra nunca usada (regra 111)
      v_letter := private.letter_for(v_w.letters_used);
      v_w.letters_used := v_w.letters_used + 1;
      insert into public.workout_days (workout_id, letter, name, position)
      values (v_wid, v_letter, btrim(v_day ->> 'name'), v_pos)
      returning id into v_day_id;
    end if;
    v_keep := v_keep || v_day_id;

    delete from public.workout_exercises where day_id = v_day_id;
    v_idx := 0;
    for v_ex in select * from jsonb_array_elements(v_day -> 'exercises') loop
      v_idx := v_idx + 1;
      insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, rest_seconds, note)
      values (v_day_id, (v_ex ->> 'exercise_id')::uuid, v_idx,
              (v_ex ->> 'sets')::int, btrim(v_ex ->> 'reps'),
              coalesce((v_ex ->> 'rest_seconds')::int, 0),
              nullif(btrim(coalesce(v_ex ->> 'note', '')), ''));
    end loop;
  end loop;

  -- Fichas que sumiram do payload: remoção lógica (as marcações antigas
  -- continuam no calendário, regra 7).
  update public.workout_days
     set removed_at = now()
   where workout_id = v_wid and removed_at is null and id <> all (v_keep);

  update public.workouts set letters_used = v_w.letters_used where id = v_wid;
  return v_wid;
end $$;

-- Cancelar treino agendado (regra 75). O atual segue ativo.
create or replace function public.cancel_scheduled_workout(p_workout_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_w   public.workouts%rowtype;
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  select * into v_w from public.workouts where id = p_workout_id and teacher_id = v_uid for update;
  if not found then raise exception 'workout_not_found'; end if;
  if v_w.start_date <= private.student_today(v_w.student_id) then
    raise exception 'workout_not_scheduled';
  end if;
  delete from public.workouts where id = v_w.id;
end $$;

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------
revoke all on function public.search_exercises(text, boolean, integer) from public, anon;
grant execute on function public.search_exercises(text, boolean, integer) to authenticated;
revoke all on function public.similar_exercises(text) from public, anon;
grant execute on function public.similar_exercises(text) to authenticated;
revoke all on function public.create_exercise(text, text) from public, anon;
grant execute on function public.create_exercise(text, text) to authenticated;
revoke all on function public.set_exercise_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_exercise_hidden(uuid, boolean) to authenticated;
revoke all on function public.save_workout(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_workout(uuid, uuid, jsonb) to authenticated;
revoke all on function public.cancel_scheduled_workout(uuid) from public, anon;
grant execute on function public.cancel_scheduled_workout(uuid) to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
