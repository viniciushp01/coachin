-- =====================================================================
-- Coach In · 0006 · Treino antes do aceite do convite (regra 122, 27/10)
-- Revoga a decisão 3 do schema-coach-in.md: o professor também cria e
-- edita treino para aluno com convite pendente, expirado ou recusado
-- (vínculo 'invited'), além do vínculo ativo. Aluno arquivado (troca de
-- professor ou virou professor) segue bloqueado.
--
--  1. save_workout: aceita vínculo 'invited' ou 'active' (antes só 'active').
--     O resto da função é idêntico ao do banco em 27/10.
--  2. workouts_select_teacher: o professor lê os treinos desses alunos.
--     workout_days e workout_exercises herdam por exists em workouts.
--
-- Fica como está: completions e training_requests seguem exigindo vínculo
-- ativo (marcações e solicitações só existem depois do aceite). A view
-- teacher_student_list já devolve convite_* para vínculo 'invited'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. save_workout
-- ---------------------------------------------------------------------
-- Salva o treino INTEIRO de uma vez (regra 107: só grava em "Salvar treino").
-- Cria quando p_workout_id é nulo; edita caso contrário (ativo ou agendado).
-- Vale para vínculo ativo e para convite pendente, expirado ou recusado
-- (regra 122); vínculo arquivado dá student_not_found.
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
   where id = p_student_id and teacher_id = v_uid
     and status in ('invited', 'active') for update;           -- regra 122
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

revoke all on function public.save_workout(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_workout(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Política de leitura de treinos do professor
-- ---------------------------------------------------------------------
-- O professor vê os treinos dos alunos dele com vínculo ativo ou convite
-- (pendente, expirado ou recusado); arquivado, não.
drop policy workouts_select_teacher on public.workouts;
create policy workouts_select_teacher on public.workouts
  for select to authenticated
  using (
    private.my_role() = 'professor' and teacher_id = (select auth.uid())
    and exists (select 1 from public.students s
                 where s.id = student_id and s.status in ('invited', 'active'))
  );
