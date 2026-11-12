-- =====================================================================
-- Backfill do workout_seen (regra 117, issue #151)
--
-- O pop-up "Seu treino novo chegou" passa a existir no app. Até aqui ninguém
-- chamou acknowledge_new_workout, então workout_seen está vazio e todo aluno
-- do piloto veria o pop-up do treino que já usa. Esta migration marca como
-- visto, para cada aluno com conta (students.user_id), o treino mais recente
-- (por start_date) que já começou e que tem ao menos uma marcação dele, e
-- todos os de start_date anterior ou igual (o mesmo critério de
-- acknowledge_new_workout).
--
-- Fica de fora, de propósito:
--   * treino agendado (start_date depois do "hoje" do aluno, regra 115);
--   * treino que começou depois do último usado e aluno sem marcação:
--     esses veem o pop-up uma vez, o comportamento certo;
--   * cadastro sem conta (convite pendente): o pop-up abre no 1º acesso
--     (regra 122).
--
-- Não muda schema nem as funções existentes. A função abaixo é privada
-- (fora da API), idempotente, e fica para os testes do banco a chamarem.
-- =====================================================================

create or replace function private.backfill_workout_seen() returns integer
language sql security definer set search_path = public as $$
  with ultimo_usado as (
    select s.id as student_id, s.user_id, max(w.start_date) as ate
      from public.students s
      join public.workouts w on w.student_id = s.id
     where s.user_id is not null
       and w.start_date <= private.student_today(s.id)
       and exists (select 1 from public.completions c
                    where c.student_id = s.id and c.workout_id = w.id)
     group by s.id, s.user_id
  ), marcados as (
    insert into public.workout_seen (user_id, workout_id)
    select u.user_id, w.id
      from ultimo_usado u
      join public.workouts w on w.student_id = u.student_id and w.start_date <= u.ate
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from marcados
$$;

revoke all on function private.backfill_workout_seen() from public, anon, authenticated;

select private.backfill_workout_seen();
