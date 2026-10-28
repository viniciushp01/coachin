-- =====================================================================
-- Coach In · 0005 · Correções apontadas pelo Security/Performance Advisor
-- Sem mudança de regra de negócio: o comportamento das políticas e funções
-- é o mesmo das migrations 0001 a 0003.
--
--  1. search_path fixo nas funções auxiliares de private que não tinham
--     (lint 0011). Os corpos já usam nomes qualificados (extensions.*,
--     private.*), então um search_path vazio basta. normalize_name usa
--     'extensions' por garantia: unaccent() procura o dicionário "unaccent".
--  2. auth.uid() -> (select auth.uid()) nas políticas (lint 0003): o valor é
--     calculado uma vez por consulta, não uma vez por linha.
--  3. Índices nas chaves estrangeiras sem cobertura (lint 0001).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. search_path
-- ---------------------------------------------------------------------
alter function private.touch_updated_at() set search_path = '';
alter function private.norm_email(text) set search_path = '';
alter function private.email_valid(text) set search_path = '';
alter function private.phone_valid(text) set search_path = '';
alter function private.new_token() set search_path = '';
alter function private.hash_token(text) set search_path = '';
alter function private.invite_state(public.invite_status, timestamptz) set search_path = '';
alter function private.normalize_name(text) set search_path = extensions;
alter function private.exercises_normalize() set search_path = '';
alter function private.exercises_no_delete() set search_path = '';
alter function private.letter_for(int) set search_path = '';

-- ---------------------------------------------------------------------
-- 2. (select auth.uid()) nas políticas
-- ---------------------------------------------------------------------
-- 0001
alter policy profiles_select_own on public.profiles
  using (id = (select auth.uid()));
alter policy profiles_update_own on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy students_select_teacher on public.students
  using (private.my_role() = 'professor' and teacher_id = (select auth.uid()) and status <> 'archived');
alter policy students_select_self on public.students
  using (private.my_role() = 'aluno' and user_id = (select auth.uid()));
alter policy student_profiles_select_own on public.student_profiles
  using (user_id = (select auth.uid()) and private.my_role() = 'aluno');
alter policy student_profile_changes_select_own on public.student_profile_changes
  using (user_id = (select auth.uid()) and private.my_role() = 'aluno');
alter policy invites_select_teacher on public.invites
  using (kind = 'student' and inviter_id = (select auth.uid()) and private.my_role() = 'professor');

-- 0002
alter policy exercises_select on public.exercises
  using (
    private.my_role() is not null
    and (owner_id is null
         or owner_id = (select auth.uid())
         or (private.my_role() = 'aluno' and private.student_can_see_exercise(id)))
  );
alter policy exercise_hidden_select_own on public.exercise_hidden
  using (teacher_id = (select auth.uid()) and private.my_role() = 'professor');
alter policy workouts_select_teacher on public.workouts
  using (
    private.my_role() = 'professor' and teacher_id = (select auth.uid())
    and exists (select 1 from public.students s
                 where s.id = student_id and s.status = 'active')
  );
alter policy workouts_select_student on public.workouts
  using (
    private.my_role() = 'aluno'
    and exists (select 1 from public.students s
                 where s.id = student_id and s.user_id = (select auth.uid()))
    and start_date <= private.user_today((select auth.uid()))
  );

-- 0003
alter policy completions_select_teacher on public.completions
  using (private.my_role() = 'professor'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.teacher_id = (select auth.uid()) and s.status = 'active'));
alter policy completions_select_student on public.completions
  using (private.my_role() = 'aluno'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.user_id = (select auth.uid())));
alter policy loads_select_student on public.student_exercise_loads
  using (user_id = (select auth.uid()) and private.my_role() = 'aluno');
alter policy load_history_select_student on public.load_history
  using (user_id = (select auth.uid()) and private.my_role() = 'aluno');
alter policy requests_select_teacher on public.training_requests
  using (private.my_role() = 'professor'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.teacher_id = (select auth.uid()) and s.status = 'active'));
alter policy requests_select_student on public.training_requests
  using (private.my_role() = 'aluno'
         and exists (select 1 from public.students s
                      where s.id = student_id and s.user_id = (select auth.uid())));
alter policy workout_seen_select_own on public.workout_seen
  using (user_id = (select auth.uid()) and private.my_role() = 'aluno');

-- ---------------------------------------------------------------------
-- 3. Índices nas chaves estrangeiras
-- ---------------------------------------------------------------------
create index completions_day_idx             on public.completions (day_id);
create index exercise_hidden_exercise_idx    on public.exercise_hidden (exercise_id);
create index invites_accepted_by_idx         on public.invites (accepted_by);
create index load_history_exercise_idx       on public.load_history (exercise_id);
create index student_exercise_loads_exercise_idx on public.student_exercise_loads (exercise_id);
create index workout_seen_workout_idx        on public.workout_seen (workout_id);
create index workouts_student_teacher_idx    on public.workouts (student_id, teacher_id);
