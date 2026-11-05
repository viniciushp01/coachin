-- 0011 · Regras 123 e 148 (#94): o professor ajusta a medida e o modo de carga do exercício dele.
-- Só muda o exercício: `student_exercise_loads` e `load_history` não são tocadas, então de "sim"
-- para "não" e de volta o histórico fica, e o `reps` das fichas segue como foi digitado (regra 124).
-- Predefinido é fixo; exercício de outro professor nem existe para quem chama.
create function public.set_exercise_settings(
  p_exercise_id uuid, p_load_mode text, p_measure text
) returns public.exercises
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_row   public.exercises;
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  select e.owner_id into v_owner from public.exercises e where e.id = p_exercise_id;
  if not found then raise exception 'exercise_not_found'; end if;
  if v_owner is null then raise exception 'exercise_predefined'; end if;
  if v_owner <> v_uid then raise exception 'exercise_not_found'; end if;
  if p_load_mode is null or p_load_mode not in ('required', 'optional', 'none') then
    raise exception 'load_mode_invalid';
  end if;
  if p_measure is null or p_measure not in ('reps', 'time') then
    raise exception 'measure_invalid';
  end if;
  update public.exercises
     set load_mode = p_load_mode, measure = p_measure
   where id = p_exercise_id
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.set_exercise_settings(uuid, text, text) from public, anon;
grant execute on function public.set_exercise_settings(uuid, text, text) to authenticated;
