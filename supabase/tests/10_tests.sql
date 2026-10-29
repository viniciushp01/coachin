-- =====================================================================
-- Testes de ponta a ponta das migrations (rodam com supabase/tests/run.sh)
-- Cada bloco DO é uma transação própria; "set local role" simula o
-- usuário logado (a RLS só vale para quem NÃO é dono da tabela).
-- Qualquer falha aborta o script com "FAIL: ...".
-- =====================================================================
create schema t;
grant usage on schema t to anon, authenticated;
create table t.kv (k text primary key, v text);
grant all on t.kv to anon, authenticated;

create function t.uid(p text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' ||
    case p when 'admin' then 'a1' when 't1' then 'b1' when 't2' then 'b2'
           when 's1' then 'c1' when 's2' then 'c2' when 's3' then 'c3' when 's4' then 'c4'
           when 's5' then 'c5' when 's6' then 'c6' end)::uuid
$$;
create function t.su() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
create function t.login(p text) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', t.uid(p), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function t.anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;
create function t.put(k text, v text) returns void language sql as $$
  insert into t.kv values (k, v) on conflict (k) do update set v = excluded.v
$$;
create function t.get(p text) returns text language sql stable as $$
  select v from t.kv where k = p
$$;
create function t.ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAIL: %', p_msg; end if;
  raise notice 'ok  - %', p_msg;
end $$;
create function t.err(p_sql text, p_expected text) returns void language plpgsql as $$
declare v text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v = message_text;
    if position(p_expected in v) > 0 then
      raise notice 'ok  - erro esperado [%]', p_expected;
      return;
    end if;
    raise exception 'FAIL: esperava erro [%] mas veio [%] em: %', p_expected, v, p_sql;
  end;
  raise exception 'FAIL: esperava erro [%] e nada aconteceu em: %', p_expected, p_sql;
end $$;
create function t.today(p_tz text default 'America/Sao_Paulo') returns date language sql stable as $$
  select (now() at time zone p_tz)::date
$$;
create function t.exid(p text) returns uuid language sql stable as $$
  select id from public.exercises where name = p
$$;
create function t.item(p_name text, p_sets int, p_reps text, p_rest int default 60) returns jsonb
language sql stable as $$
  select jsonb_build_object('exercise_id', t.exid(p_name), 'sets', p_sets, 'reps', p_reps, 'rest_seconds', p_rest)
$$;
create function t.day(p_id uuid, p_name text, p_items jsonb[]) returns jsonb language sql stable as $$
  select jsonb_build_object('id', p_id, 'name', p_name, 'exercises', to_jsonb(p_items))
$$;
create function t.dayid(p_workout uuid, p_letter text) returns uuid language sql stable as $$
  select id from public.workout_days where workout_id = p_workout and letter = p_letter
$$;

-- ---------------------------------------------------------------------
-- 1. Contas e papéis
-- ---------------------------------------------------------------------
do $$ begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
    (t.uid('admin'), 'Admin@X.com', now(), '{}'),
    (t.uid('t1'), 't1@x.com', now(), '{}'),
    (t.uid('t2'), 't2@x.com', now(), '{}'),
    (t.uid('s1'), 's1@x.com', now(), '{"full_name":"Ana"}'),
    (t.uid('s2'), 's2@x.com', now(), '{}'),
    (t.uid('s3'), 's3@x.com', now(), '{}'),
    (t.uid('s4'), 's4@x.com', now(), '{}');
  perform t.ok((select count(*) from public.profiles) = 7, 'gatilho cria um perfil por conta');
  perform t.ok((select count(*) from public.profiles where role = 'aluno') = 7, 'toda conta nasce como aluno');
  perform t.ok((select email from public.profiles where id = t.uid('admin')) = 'admin@x.com', 'e-mail do perfil normalizado em minúsculas');
  perform t.ok((select full_name from public.profiles where id = t.uid('s1')) = 'Ana', 'nome vem do cadastro da conta');
  update public.profiles set role = 'admin', full_name = 'Dono' where id = t.uid('admin');
  perform t.ok((select count(*) from public.exercises where owner_id is null) >= 140, 'biblioteca pré-definida carregada (' || (select count(*) from public.exercises where owner_id is null) || ' exercícios)');
end $$;

-- ---------------------------------------------------------------------
-- 2. Escrita direta bloqueada; papel não se promove sozinho
-- ---------------------------------------------------------------------
do $$ begin
  perform t.login('s1');
  perform t.err($q$ update public.profiles set role = 'admin' where id = auth.uid() $q$, 'permission denied');
  perform t.err($q$ update public.profiles set status = 'active' where id = auth.uid() $q$, 'permission denied');
  perform t.err($q$ insert into public.students (teacher_id, name) values (auth.uid(), 'x') $q$, 'permission denied');
  perform t.err($q$ insert into public.completions (student_id, workout_id, day_id, done_on, marked_at, client_action_id) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), current_date, now(), gen_random_uuid()) $q$, 'permission denied');
  perform t.err($q$ select public.handle_new_user() $q$, 'permission denied');
  perform t.err($q$ select public.create_teacher_invite('x', 'x@x.com') $q$, 'forbidden');
  perform t.err($q$ select public.set_teacher_status(auth.uid(), 'blocked') $q$, 'forbidden');
  perform t.anon();
  perform t.err($q$ select * from public.profiles $q$, 'permission denied');
  perform t.err($q$ select public.create_student_with_invite('x') $q$, 'permission denied');
end $$;

-- ---------------------------------------------------------------------
-- 3. Convite de professor (administrador)
-- ---------------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform t.login('admin');
  r := public.create_teacher_invite('Prof Um', 'T1@x.com');
  perform t.put('inv_t1_old', r ->> 'token');
  r := public.create_teacher_invite('Prof Um', 't1@x.com');            -- novo convite invalida o anterior
  perform t.put('inv_t1', r ->> 'token');
  perform t.put('inv_t2_id', (public.create_teacher_invite('Prof Dois', 't2@x.com')) ->> 'invite_id');
  r := public.reissue_invite((t.get('inv_t2_id'))::uuid);
  perform t.put('inv_t2', r ->> 'token'); perform t.put('inv_t2_id', r ->> 'invite_id');
  perform t.err($q$ select public.create_teacher_invite('x', 'admin@x.com') $q$, 'email_is_admin');
  perform t.err($q$ select public.create_teacher_invite('', 'a@b.com') $q$, 'name_required');
  perform t.err($q$ select public.create_teacher_invite('x', 'sem-arroba') $q$, 'email_invalid');

  perform t.anon();
  r := public.get_invite_preview(t.get('inv_t1'));
  perform t.ok(r ->> 'state' = 'valid' and r ->> 'kind' = 'teacher' and (r ->> 'account_exists')::boolean, 'preview anônimo: convite de professor válido e conta existe');
  perform t.ok(public.get_invite_preview(t.get('inv_t1_old')) ->> 'state' = 'replaced', 'preview: link antigo = replaced');
  perform t.ok(public.get_invite_preview('lixo') ->> 'state' = 'invalid', 'preview: token inexistente = invalid');
  perform t.ok(public.get_invite_preview(t.get('inv_t2')) ->> 'inviter_name' = 'Dono', 'preview mostra quem convidou');

  perform t.login('t1');
  perform t.err(format($q$ select public.accept_teacher_invite(%L) $q$, t.get('inv_t1_old')), 'invite_replaced');
  perform t.login('s1');
  perform t.err(format($q$ select public.accept_teacher_invite(%L) $q$, t.get('inv_t1')), 'email_mismatch');
  perform t.login('t1');
  perform public.accept_teacher_invite(t.get('inv_t1'));
  perform t.ok((select role from public.profiles where id = auth.uid()) = 'professor', 'conta vira professor');
  perform t.ok((select full_name from public.profiles where id = auth.uid()) = 'Prof Um', 'nome do convite preenche o perfil vazio');
  perform t.err(format($q$ select public.accept_teacher_invite(%L) $q$, t.get('inv_t1')), 'already_teacher');

  -- convite vencido
  perform t.su();
  update public.invites set expires_at = now() - interval '1 minute' where token_hash = private.hash_token(t.get('inv_t2'));
  perform t.login('t2');
  perform t.err(format($q$ select public.accept_teacher_invite(%L) $q$, t.get('inv_t2')), 'invite_expired');
  perform t.login('admin');
  perform t.ok((select count(*) from public.invites where kind = 'teacher' and status = 'pending') = 1, 'só um convite de professor pendente (vencido)');
  r := public.reissue_invite((t.get('inv_t2_id'))::uuid);
  perform t.put('inv_t2', r ->> 'token');
  perform t.login('t2');
  perform public.accept_teacher_invite(t.get('inv_t2'));
  perform t.ok((select role from public.profiles where id = auth.uid()) = 'professor', 'convite reemitido funciona');

  perform t.login('admin');
  perform t.err($q$ select public.create_teacher_invite('x', 't1@x.com') $q$, 'already_teacher');
  perform t.ok((select count(*) from public.profiles) = 3, 'admin enxerga só a si e os 2 professores (não vê alunos)');
end $$;

-- ---------------------------------------------------------------------
-- 4. Cadastro de aluno, convite e vínculo
-- ---------------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform t.login('t1');
  r := public.create_student_with_invite('Ana', 'S1@x.com', '+5531999990001');
  perform t.put('st_s1', r ->> 'student_id');
  perform t.put('inv_s1', r ->> 'token'); perform t.put('inv_s1_id', r ->> 'invite_id');
  perform t.err($q$ select public.create_student_with_invite('Ana 2', 's1@x.com') $q$, 'student_email_taken');
  perform t.err($q$ select public.create_student_with_invite('X', null, '31999') $q$, 'phone_invalid');
  perform t.err($q$ select public.create_student_with_invite('  ') $q$, 'name_required');
  perform t.err($q$ select public.create_student_with_invite('X', 'inválido') $q$, 'email_invalid');
  perform t.ok((select list_status from public.teacher_student_list where student_id = (t.get('st_s1'))::uuid) = 'convite_pendente', 'lista: convite pendente');

  perform t.login('t2');
  r := public.create_student_with_invite('Bia', 's2@x.com');
  perform t.put('st_s2', r ->> 'student_id'); perform t.put('inv_s2_t2', r ->> 'token');
  perform t.ok((select count(*) from public.teacher_student_list) = 1, 'professor 2 só vê o aluno dele na lista');
  perform t.ok((select count(*) from public.students where id = (t.get('st_s1'))::uuid) = 0, 'professor 2 não enxerga aluno do professor 1');
  perform t.err(format($q$ select public.reissue_invite(%L) $q$, t.get('inv_s1_id')), 'forbidden');   -- convite de outro professor
  perform t.err($q$ select public.reissue_invite(gen_random_uuid()) $q$, 'invite_not_found');
  perform t.login('s2');
  perform t.err($q$ select public.create_student_with_invite('x') $q$, 'forbidden');

  perform t.anon();
  r := public.get_invite_preview(t.get('inv_s1'));
  perform t.ok(r ->> 'state' = 'valid' and r ->> 'inviter_name' = 'Prof Um' and r ->> 'invitee_name' = 'Ana', 'preview do convite de aluno');

  -- aceitar
  perform t.login('s1');
  perform t.err(format($q$ select public.accept_student_invite(%L) $q$, 'lixo'), 'invite_invalid');
  r := public.accept_student_invite(t.get('inv_s1'));
  perform t.ok((r ->> 'needs_first_access')::boolean and not (r ->> 'switched')::boolean, 'aluno vinculado; primeiro acesso pendente');
  perform t.err(format($q$ select public.accept_student_invite(%L) $q$, t.get('inv_s1')), 'invite_used');
  perform t.ok((select status from public.students where id = (t.get('st_s1'))::uuid) = 'active', 'vínculo ativo');

  -- professor logado não aceita convite de aluno
  perform t.login('t2');
  perform t.err(format($q$ select public.accept_student_invite(%L) $q$, t.get('inv_s1')), 'role_not_allowed');
end $$;

-- ---------------------------------------------------------------------
-- 5. Primeiro acesso e perfil do aluno
-- ---------------------------------------------------------------------
do $$ begin
  perform t.login('s1');
  perform t.err($q$ select public.save_student_profile('Ana', date '2000-01-01', '+5531999990001', 1.65, 60) $q$, 'notice_not_accepted');
  perform public.accept_data_notice();
  perform t.err($q$ select public.save_student_profile('', date '2000-01-01', '+5531999990001', 1.65, 60) $q$, 'name_required');
  perform t.err($q$ select public.save_student_profile('Ana', current_date + 1, '+5531999990001', 1.65, 60) $q$, 'birth_date_invalid');
  perform t.err($q$ select public.save_student_profile('Ana', date '2000-01-01', 'abc', 1.65, 60) $q$, 'phone_invalid');
  perform t.err($q$ select public.save_student_profile('Ana', date '2000-01-01', '+5531999990001', 3.00, 60) $q$, 'height_invalid');
  perform t.err($q$ select public.save_student_profile('Ana', date '2000-01-01', '+5531999990001', 1.65, 10) $q$, 'weight_invalid');
  perform t.ok((select completed_at is null from public.student_profiles where user_id = auth.uid()), 'perfil incompleto enquanto não concluir (retomar passo 2)');
  perform public.save_student_profile('Ana Souza', date '2000-01-01', '+5531999990001', 1.65, 60, 'Joelho direito');
  perform t.ok((select completed_at is not null from public.student_profiles where user_id = auth.uid()), 'perfil concluído');
  perform t.ok((select count(*) from public.student_profile_changes where user_id = auth.uid()) = 5, 'cada campo gravado no histórico de edições');
  perform public.save_student_profile('Ana Souza', date '2000-01-01', '+5531999990001', 1.65, 58.5, 'Joelho direito');
  perform t.ok((select old_value || '>' || new_value from public.student_profile_changes where user_id = auth.uid() and field = 'weight_kg' order by id desc limit 1) = '60.00>58.50', 'edição de peso guarda valor antigo e novo');
  perform t.ok((select name from public.students where id = (t.get('st_s1'))::uuid) = 'Ana Souza', 'nome do perfil sincroniza com o vínculo');

  perform t.login('t1');
  perform t.ok((select weight_kg from public.student_profiles where user_id = t.uid('s1')) = 58.5, 'professor lê o perfil do aluno vinculado');
  perform t.ok((select count(*) from public.student_profile_changes) = 0, 'professor não lê o histórico de edições');
  perform t.err($q$ update public.student_profiles set weight_kg = 1 $q$, 'permission denied');
  perform t.login('t2');
  perform t.ok((select count(*) from public.student_profiles) = 0, 'outro professor não lê o perfil');
  perform t.login('admin');
  perform t.ok((select count(*) from public.student_profiles) = 0 and (select count(*) from public.students) = 0, 'administrador não enxerga dados de alunos');
  perform t.ok((select active_students from public.admin_teacher_student_counts() where teacher_id = t.uid('t1')) = 1, 'administrador vê só a contagem de alunos');
  perform t.login('s1');
  perform t.ok((select count(*) from public.admin_teacher_student_counts()) = 0, 'aluno não vê contagens');
end $$;

-- ---------------------------------------------------------------------
-- 6. Biblioteca de exercícios
-- ---------------------------------------------------------------------
do $$
declare v_ex public.exercises;
begin
  perform t.login('t1');
  perform t.ok((select count(*) from public.search_exercises('supino')) >= 8, 'busca "supino" encontra vários');
  perform t.ok(exists (select 1 from public.search_exercises('SUPÍNO reto barra') where name = 'Supino reto com barra'), 'busca ignora acento, caixa e ordem aproximada');
  perform t.ok(exists (select 1 from public.similar_exercises('Supino reto barra') where name = 'Supino reto com barra'), 'aviso de exercício parecido');
  perform t.err($q$ select public.create_exercise('supino RETO com barra') $q$, 'exercise_exists');
  v_ex := public.create_exercise('Rosca do Vini', 'Bíceps');
  perform t.err($q$ select public.create_exercise('rosca do vini') $q$, 'exercise_exists');
  perform t.ok((select count(*) from public.search_exercises('vini')) = 1, 'professor vê o exercício que criou');
  perform t.login('t2');
  perform t.ok((select count(*) from public.search_exercises('vini')) = 0, 'outro professor não vê exercício privado');
  perform t.ok((select count(*) from public.exercises where owner_id is not null) = 0, 'RLS: exercícios privados invisíveis');
  perform public.create_exercise('Rosca do Vini');                       -- mesmo nome, outro professor, permitido
  perform t.login('t1');
  perform public.set_exercise_hidden(t.exid('Rosca 21'), true);
  perform t.ok(not exists (select 1 from public.search_exercises('rosca 21') where name = 'Rosca 21'), 'ocultar tira da busca');
  perform t.ok((select count(*) from public.search_exercises('', true)) = 1 and exists (select 1 from public.search_exercises('', true) where name = 'Rosca 21'), 'lista de ocultos');
  perform t.login('t2');
  perform t.ok(exists (select 1 from public.search_exercises('rosca 21') where name = 'Rosca 21'), 'ocultar vale só para quem ocultou');
  perform t.login('t1');
  perform public.set_exercise_hidden(t.exid('Rosca 21'), false);
  perform t.ok(exists (select 1 from public.search_exercises('rosca 21') where name = 'Rosca 21'), 'desfazer ocultar');
  perform t.su();
  perform t.err($q$ delete from public.exercises where owner_id is null $q$, 'exercises_are_permanent');
end $$;

-- ---------------------------------------------------------------------
-- 7. Montagem do treino
-- ---------------------------------------------------------------------
do $$
declare
  v_s uuid := (t.get('st_s1'))::uuid;
  v_w uuid; v_w2 uuid; v_dayA uuid; v_dayB uuid; v_end date;
  v_base jsonb;
begin
  perform t.login('t1');
  v_base := jsonb_build_object('name', 'Hipertrofia', 'start_date', t.today(), 'weeks', 8,
    'suggested_frequency', '5x por semana',
    'days', jsonb_build_array(
      t.day(null, 'Peito e tríceps', array[t.item('Supino reto com barra', 4, '10', 90), t.item('Tríceps pulley com corda', 3, '12')]),
      t.day(null, 'Costas e bíceps',  array[t.item('Puxada frontal na polia alta', 4, '10'), t.item('Rosca direta com barra reta', 3, '12')])));

  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || '{"name":""}')::text), 'workout_name_required');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || '{"weeks":0}')::text), 'weeks_invalid');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || '{"days":[]}')::text), 'workout_needs_day');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || jsonb_build_object('days', jsonb_build_array(jsonb_build_object('name','Vazia','exercises','[]'::jsonb))))::text), 'day_needs_exercise');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || jsonb_build_object('start_date', t.today() - 1))::text), 'start_in_past');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || jsonb_build_object('days', jsonb_build_array(t.day(null,'X',array[jsonb_build_object('exercise_id', gen_random_uuid(),'sets',3,'reps','10')]))))::text), 'exercise_not_found');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || jsonb_build_object('days', jsonb_build_array(t.day(null,'X',array[t.item('Supino reto com barra', 0, '10')]))))::text), 'sets_invalid');

  v_w := public.save_workout(v_s, null, v_base);
  perform t.put('w1', v_w::text);
  select end_date into v_end from public.workouts where id = v_w;
  perform t.ok(v_end = t.today() + 55, 'fim = início + 7 x semanas - 1');
  perform t.ok((select string_agg(letter, '' order by position) from public.workout_days where workout_id = v_w) = 'AB', 'fichas A e B');
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s) = 'ativo', 'lista: aluno ativo');

  -- agendado: no máximo um por aluno
  v_w2 := public.save_workout(v_s, null, v_base || jsonb_build_object('name','Próximo','start_date', t.today() + 14, 'weeks', 4));
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s) = 'ativo' and (select scheduled_workout_id from public.teacher_student_list where student_id = v_s) = v_w2, 'lista mostra o agendado');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, (v_base || jsonb_build_object('start_date', t.today() + 30))::text), 'scheduled_exists');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, v_base::text), 'start_date_taken');
  perform public.save_workout(v_s, v_w2, v_base || jsonb_build_object('name','Próximo (alterado)','start_date', t.today() + 10, 'weeks', 4));
  perform t.ok((select start_date from public.workouts where id = v_w2) = t.today() + 10, 'alterar treino agendado');

  -- o aluno não vê o agendado; o professor vê os dois
  perform t.login('s1');
  perform t.ok((select count(*) from public.workouts) = 1, 'aluno não enxerga treino agendado');
  perform t.ok((select count(*) from public.workout_days) = 2 and (select count(*) from public.workout_exercises) = 4, 'aluno enxerga fichas e exercícios do ativo');
  perform t.login('t1');
  perform t.ok((select count(*) from public.workouts) = 2, 'professor enxerga ativo e agendado');
  perform t.login('t2');
  perform t.ok((select count(*) from public.workouts) = 0, 'outro professor não enxerga treinos');
  perform t.err(format($q$ select public.cancel_scheduled_workout(%L) $q$, v_w2), 'workout_not_found');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_s, v_base::text), 'student_not_found');

  -- cancelar agendamento
  perform t.login('t1');
  perform t.err(format($q$ select public.cancel_scheduled_workout(%L) $q$, v_w), 'workout_not_scheduled');
  perform public.cancel_scheduled_workout(v_w2);
  perform t.ok((select count(*) from public.workouts) = 1, 'agendamento cancelado; o atual segue ativo');

  -- editar o ativo: remove B, ganha Pernas (letra C, nunca a B de novo)
  v_dayA := t.dayid(v_w, 'A'); v_dayB := t.dayid(v_w, 'B');
  perform t.err(format($q$ select public.save_workout(%L, %L, %L::jsonb) $q$, v_s, v_w, (v_base || '{"weeks":9}')::text), 'active_workout_dates_locked');
  perform t.err(format($q$ select public.save_workout(%L, %L, %L::jsonb) $q$, v_s, v_w, (v_base || jsonb_build_object('days', jsonb_build_array(t.day(gen_random_uuid(),'X',array[t.item('Supino reto com barra',3,'10')]))))::text), 'day_not_found');
  perform public.save_workout(v_s, v_w, jsonb_build_object('name','Hipertrofia','start_date', t.today(), 'weeks', 8,
    'days', jsonb_build_array(
      t.day(v_dayA, 'Peito e tríceps (v2)', array[t.item('Supino reto com barra', 5, '8', 120)]),
      t.day(null, 'Pernas', array[t.item('Agachamento livre com barra', 4, '8'), t.item('Rosca do Vini', 3, '12')]))));
  perform t.ok((select string_agg(letter || case when removed_at is null then '' else '(removida)' end, ',' order by letter) from public.workout_days where workout_id = v_w) = 'A,B(removida),C', 'letras fixas: B removida, nova ficha vira C');
  perform t.ok((select name from public.workout_days where id = v_dayA) = 'Peito e tríceps (v2)', 'ficha A renomeada');
  perform t.ok((select count(*) from public.workout_exercises where day_id = v_dayA) = 1, 'exercícios da ficha A substituídos');
  perform t.ok((select letters_used from public.workouts where id = v_w) = 3, 'contador de letras só avança');
  perform t.put('dayA', v_dayA::text); perform t.put('dayB', v_dayB::text); perform t.put('dayC', t.dayid(v_w, 'C')::text);
end $$;

-- ---------------------------------------------------------------------
-- 8. Marcações, treino concluído, treino encerrado e cargas
-- ---------------------------------------------------------------------
do $$
declare
  v_w uuid := (t.get('w1'))::uuid; v_s uuid := (t.get('st_s1'))::uuid;
  dA uuid := (t.get('dayA'))::uuid; dB uuid := (t.get('dayB'))::uuid;
  a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); a3 uuid := gen_random_uuid();
  v_removed timestamptz;
begin
  -- emula 10 dias passados desde o início
  perform t.su();
  update public.workouts set start_date = start_date - 10 where id = v_w;
  select removed_at into v_removed from public.workout_days where id = dB;

  perform t.login('s1');
  perform public.mark_done(dA, t.today() - 5, a1);
  perform public.mark_done(dA, t.today() - 5, a1);                       -- reenvio da fila: não duplica
  perform public.mark_done(dA, t.today() - 5, a2);                       -- mesma ficha no mesmo dia: não duplica
  perform t.ok((select count(*) from public.completions) = 1, 'marcar é idempotente');
  perform public.mark_done(dA, t.today(), a3);
  perform t.ok((select count(*) from public.completions) = 2, 'marcar em outro dia cria nova marcação');
  perform t.err(format($q$ select public.mark_done(%L, current_date + 3, gen_random_uuid()) $q$, dA), 'date_out_of_range');
  perform t.err(format($q$ select public.mark_done(%L, %L, gen_random_uuid()) $q$, dA, t.today() - 11), 'date_out_of_range');
  perform t.err(format($q$ select public.mark_done(%L, %L, gen_random_uuid()) $q$, dB, t.today()), 'day_removed');
  perform public.mark_done(dB, t.today() - 2, gen_random_uuid(), v_removed - interval '1 hour');   -- ação feita offline ANTES da remoção
  perform t.ok((select count(*) from public.completions) = 3, 'marcação offline de ficha removida depois vale (regra 116)');
  perform t.err(format($q$ select public.mark_done(%L, %L, gen_random_uuid()) $q$, gen_random_uuid(), t.today()), 'day_not_found');
  perform public.undo_done(dA, t.today());
  perform public.undo_done(dA, t.today());                                 -- idempotente
  perform t.ok((select count(*) from public.completions) = 2, 'desfazer marcação (e repetir não dá erro)');

  perform t.login('s2');
  perform t.err(format($q$ select public.mark_done(%L, current_date, gen_random_uuid()) $q$, dA), 'no_teacher_link');
  perform t.login('t1');
  perform t.ok((select count(*) from public.completions) = 2, 'professor lê as marcações do aluno');
  perform t.err($q$ delete from public.completions $q$, 'permission denied');
  perform t.login('t2');
  perform t.ok((select count(*) from public.completions) = 0, 'outro professor não lê marcações');

  -- Cargas (última edição por HORA DA AÇÃO, não do envio)
  perform t.login('s1');
  perform public.set_load(t.exid('Supino reto com barra'), 50, gen_random_uuid(), now() - interval '2 hours');
  perform public.set_load(t.exid('Supino reto com barra'), 60, gen_random_uuid(), now() - interval '1 hour');
  a1 := gen_random_uuid();
  perform public.set_load(t.exid('Supino reto com barra'), 40, a1, now() - interval '3 hours');  -- chegou atrasada
  perform public.set_load(t.exid('Supino reto com barra'), 40, a1, now() - interval '3 hours');  -- reenvio
  perform t.ok((select kg from public.student_exercise_loads where exercise_id = t.exid('Supino reto com barra')) = 60, 'carga atual = edição mais recente pela hora da ação');
  perform t.ok((select count(*) from public.load_history where exercise_id = t.exid('Supino reto com barra')) = 3, 'histórico guarda as 3 edições, sem duplicar o reenvio');
  perform t.ok((select exercise_name from public.load_history limit 1) = 'Supino reto com barra', 'histórico guarda o nome do exercício');
  perform t.err(format($q$ select public.set_load(%L, 10, gen_random_uuid()) $q$, t.exid('Agachamento hack')), 'exercise_not_in_workout');
  perform t.err(format($q$ select public.set_load(%L, 0, gen_random_uuid()) $q$, t.exid('Supino reto com barra')), 'load_invalid');
  perform public.set_load(t.exid('Rosca do Vini'), 12, gen_random_uuid());
  perform t.ok((select count(*) from public.student_exercise_loads) = 2, 'cargas de 2 exercícios');
  perform t.login('t1');
  perform t.ok((select count(*) from public.student_exercise_loads) = 2, 'professor lê as cargas do aluno');
  perform t.login('t2');
  perform t.ok((select count(*) from public.student_exercise_loads) = 0, 'outro professor não lê cargas');

  -- Treino concluído segue ativo e aceita marcação (regra 43)
  perform t.su();
  update public.workouts set start_date = t.today() - 70 where id = v_w;       -- fim há 15 dias
  perform t.login('s1');
  perform public.mark_done(dA, t.today(), gen_random_uuid());
  perform t.ok((select count(*) from public.completions where done_on = t.today()) = 1, 'aluno marca treino depois da data de fim (concluído segue ativo)');
  perform t.login('t1');
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s) = 'ativo' and (select current_concluded from public.teacher_student_list where student_id = v_s), 'lista: concluído continua "ativo" (regra 56)');
  perform t.su();
  update public.workouts set start_date = t.today() - 52 where id = v_w;       -- fim em 3 dias
  perform t.login('t1');
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s) = 'quase_no_fim', 'lista: quase no fim');
  perform t.su();
  update public.workouts set start_date = t.today() - 10 where id = v_w;
end $$;

-- ---------------------------------------------------------------------
-- 9. Solicitação de novo treino, treino encerrado e aviso de treino novo
-- (cada etapa é uma transação própria: pedido e treino têm horários distintos)
-- ---------------------------------------------------------------------
do $$
declare v_s uuid := (t.get('st_s1'))::uuid;
begin
  perform t.login('s1');
  perform public.request_new_workout();
  perform t.err($q$ select public.request_new_workout() $q$, 'request_already_open');
  perform t.login('t1');
  perform t.ok((select has_open_request and request_cancelable from public.teacher_student_list where student_id = v_s), 'lista: pediu treino');
  perform t.login('s1');
  perform public.cancel_training_request();
  perform t.err($q$ select public.cancel_training_request() $q$, 'no_open_request');
  perform t.login('t1');
  perform t.ok(not (select has_open_request from public.teacher_student_list where student_id = v_s), 'pedido cancelado some da lista do professor');
  perform t.login('s1');
  perform public.request_new_workout();
end $$;

do $$
declare v_s uuid := (t.get('st_s1'))::uuid; v_w3 uuid;
begin
  perform t.login('t1');                                                   -- professor agenda (depois do pedido)
  v_w3 := public.save_workout(v_s, null, jsonb_build_object('name','Treino novo','start_date', t.today() + 20, 'weeks', 6,
    'days', jsonb_build_array(t.day(null,'Pernas', array[t.item('Agachamento hack', 4, '10')]))));
  perform t.put('w3', v_w3::text);
  perform t.ok((select has_open_request and not request_cancelable from public.teacher_student_list where student_id = v_s), 'lista: pedido segue aberto, mas não cancelável (professor já agiu)');
  perform t.login('s1');
  perform t.err($q$ select public.cancel_training_request() $q$, 'professor_already_acted');
  perform t.login('t1');
  perform public.cancel_scheduled_workout(v_w3);                          -- cancelou o agendamento: volta a "aberto"
  perform t.login('s1');
  perform public.cancel_training_request();
  perform t.ok(true, 'pedido volta a ser cancelável se o professor cancela o agendamento');
  perform public.request_new_workout();
end $$;

do $$
declare v_s uuid := (t.get('st_s1'))::uuid; v_w4 uuid;
begin
  perform t.login('t1');
  v_w4 := public.save_workout(v_s, null, jsonb_build_object('name','Treino novo','start_date', t.today() + 20, 'weeks', 6,
    'days', jsonb_build_array(t.day(null,'Pernas', array[t.item('Agachamento hack', 4, '10')]))));
  perform t.put('w4', v_w4::text);
  perform t.su();
  update public.workouts set start_date = t.today() - 1 where id = v_w4;   -- "chegou o dia de início"
end $$;

do $$
declare
  v_w uuid := (t.get('w1'))::uuid; v_s uuid := (t.get('st_s1'))::uuid; v_w4 uuid := (t.get('w4'))::uuid;
  dA uuid := (t.get('dayA'))::uuid;
begin
  perform t.login('t1');
  perform t.ok(not (select has_open_request from public.teacher_student_list where student_id = v_s), 'pedido atendido quando o treino novo entra em vigor');
  perform t.ok((select current_workout_id from public.teacher_student_list where student_id = v_s) = v_w4, 'treino novo virou o ativo');
  perform t.err(format($q$ select public.save_workout(%L, %L, %L::jsonb) $q$, v_s, v_w, jsonb_build_object('name','x','start_date', t.today()-10, 'weeks', 8, 'days', jsonb_build_array(t.day(dA,'x',array[t.item('Supino reto com barra',3,'10')])))::text), 'workout_not_editable');

  perform t.login('s1');
  perform t.err(format($q$ select public.mark_done(%L, %L, gen_random_uuid()) $q$, dA, t.today() - 4), 'workout_not_current');
  perform t.err(format($q$ select public.undo_done(%L, %L) $q$, dA, t.today() - 5), 'workout_not_current');
  perform t.ok((select count(*) from public.completions) = 3, 'treino encerrado: marcações antigas só consulta');
  perform public.request_new_workout();                                    -- fecha o antigo e abre outro
  perform t.ok((select count(*) from public.training_requests where status = 'open') = 1, 'só um pedido aberto por vez');

  -- aviso "Seu treino novo chegou"
  perform t.ok(public.pending_new_workout_notice() ->> 'workout_name' = 'Treino novo', 'aviso de treino novo aparece');
  perform public.acknowledge_new_workout(v_w4);
  perform t.ok(public.pending_new_workout_notice() is null, 'aviso aparece uma vez por treino');
end $$;

-- ---------------------------------------------------------------------
-- 10. Trocar de professor (arquivar) e bloqueio de professor
-- ---------------------------------------------------------------------
do $$
declare
  r jsonb; v_s uuid := (t.get('st_s1'))::uuid; v_w5 uuid;
begin
  perform t.login('t2');
  r := public.create_student_with_invite('Ana (prof 2)', 's1@x.com');
  perform t.put('st_s1_t2', r ->> 'student_id'); perform t.put('inv_s1_t2', r ->> 'token');
  r := public.create_student_with_invite('Caio', 's3@x.com');
  perform t.put('st_s3', r ->> 'student_id'); perform t.put('inv_s3', r ->> 'token');

  perform t.login('s1');
  perform t.err(format($q$ select public.accept_student_invite(%L) $q$, t.get('inv_s1_t2')), 'switch_requires_confirmation');
  r := public.accept_student_invite(t.get('inv_s1_t2'), true);
  perform t.ok((r ->> 'switched')::boolean and not (r ->> 'needs_first_access')::boolean, 'troca de professor; perfil não é refeito');
  perform t.ok((select status from public.students where id = v_s) = 'archived' and (select archive_reason from public.students where id = v_s) = 'teacher_switch', 'vínculo antigo ARQUIVADO (não apagado)');
  perform t.ok((select count(*) from public.students) = 2, 'aluno enxerga o vínculo atual e o arquivado');

  -- professor antigo perde o acesso
  perform t.login('t1');
  perform t.ok((select count(*) from public.students) = 0, 'professor antigo não vê mais o aluno');
  perform t.ok((select count(*) from public.teacher_student_list) = 0, 'nem na lista');
  perform t.ok((select count(*) from public.profiles where id = t.uid('s1')) = 0, 'nem o perfil');
  perform t.ok((select count(*) from public.student_profiles) = 0, 'nem os dados de saúde');
  perform t.ok((select count(*) from public.workouts) = 0 and (select count(*) from public.completions) = 0 and (select count(*) from public.student_exercise_loads) = 0, 'nem treinos, marcações ou cargas');
  perform t.err(format($q$ select public.save_workout(%L, null, '{}'::jsonb) $q$, v_s), 'student_not_found');

  -- aluno mantém o histórico, inclusive exercício criado pelo professor antigo
  perform t.login('s1');
  perform t.ok((select count(*) from public.workouts) = 2, 'aluno continua vendo os treinos do professor antigo');
  perform t.ok((select count(*) from public.completions) = 3, 'aluno continua vendo as próprias marcações');
  perform t.ok((select count(*) from public.exercises where name = 'Rosca do Vini') = 1, 'aluno lê o exercício privado do professor antigo');
  perform t.ok((select count(*) from public.student_exercise_loads) = 2 and (select count(*) from public.load_history) = 4, 'aluno mantém cargas e histórico');
  perform t.ok((select count(*) from public.profiles where role = 'professor') = 2, 'aluno enxerga o nome dos dois professores');
  perform t.err(format($q$ select public.mark_done(%L, current_date, gen_random_uuid()) $q$, (t.get('dayA'))::uuid), 'day_not_found');

  -- professor novo: não vê o exercício privado do antigo e nem a carga dele
  perform t.login('t2');
  perform t.ok((select count(*) from public.search_exercises('vini') where owner_id = t.uid('t1')) = 0, 'professor novo não vê exercício privado do antigo');
  perform t.ok((select count(*) from public.student_exercise_loads where user_id = t.uid('s1')) = 1, 'professor novo vê só cargas de exercícios que ele enxerga');
  perform t.ok((select count(*) from public.workouts) = 0, 'professor novo não vê treinos do antigo');
  v_w5 := public.save_workout((t.get('st_s1_t2'))::uuid, null, jsonb_build_object('name','Novo prof','start_date', t.today(), 'weeks', 4,
      'days', jsonb_build_array(t.day(null,'Única', array[t.item('Supino reto com barra', 3, '10'), t.item('Leg press 45°', 3, '12')]))));
  perform t.put('w5', v_w5::text);
  perform t.login('s1');
  perform t.ok(public.pending_new_workout_notice() ->> 'workout_name' = 'Novo prof', 'aluno recebe aviso do treino do novo professor');

  -- Bloqueio de professor
  perform t.su();
  insert into auth.sessions (user_id) values (t.uid('t2')), (t.uid('t2'));
  perform t.login('admin');
  perform public.set_teacher_status(t.uid('t2'), 'blocked');
  perform t.su();
  perform t.ok((select count(*) from auth.sessions where user_id = t.uid('t2')) = 0, 'bloquear encerra todas as sessões');
  perform t.login('t2');
  perform t.err($q$ select public.create_student_with_invite('x') $q$, 'forbidden');
  perform t.err(format($q$ select public.save_workout(%L, null, '{}'::jsonb) $q$, (t.get('st_s1_t2'))::uuid), 'forbidden');
  perform t.ok((select count(*) from public.students) = 0, 'professor bloqueado não lê alunos');
  perform t.ok((select status from public.profiles where id = auth.uid()) = 'blocked', 'professor bloqueado ainda lê o próprio perfil (tela de bloqueio)');
  perform t.login('s1');                                                   -- regra 96: aluno segue vendo o treino ativo
  perform t.ok((select count(*) from public.workouts where id = (t.get('w5'))::uuid) = 1, 'aluno de professor bloqueado segue vendo o treino');
  perform public.mark_done(t.dayid((t.get('w5'))::uuid, 'A'), t.today(), gen_random_uuid());
  perform t.ok(true, 'e segue marcando treino');
  perform t.login('s3');
  perform t.err(format($q$ select public.accept_student_invite(%L) $q$, t.get('inv_s3')), 'teacher_unavailable');
  r := public.get_invite_preview(t.get('inv_s3'));                         -- regra 133: tela própria já ao abrir
  perform t.ok(r ->> 'state' = 'teacher_unavailable', 'preview: convite de professor bloqueado = teacher_unavailable');
  perform t.ok(r ->> 'inviter_name' is not null, 'preview de professor bloqueado traz o nome do professor');
  perform t.login('admin');
  perform t.err(format($q$ select public.set_teacher_status(%L, 'blocked') $q$, t.uid('s1')), 'teacher_not_found');
  perform public.set_teacher_status(t.uid('t2'), 'active');
  perform t.ok(public.get_invite_preview(t.get('inv_s3')) ->> 'state' = 'valid', 'desbloqueado no prazo, o convite volta a valer');
  perform t.login('t2');
  perform t.ok((select count(*) from public.students) >= 2, 'desbloquear devolve o acesso como estava');
  -- Regra 134: segundo convite do professor atual. Desfeito no fim (bloco com exceção) para não
  -- mudar as contagens dos testes seguintes.
  begin
    r := public.create_student_with_invite('Segundo convite');
    perform t.login('s1');
    perform t.ok((public.get_invite_preview(r ->> 'token') ->> 'already_linked')::boolean, 'preview: aluno já vinculado ao mesmo professor = already_linked');
    perform t.err(format($q$ select public.accept_student_invite(%L) $q$, r ->> 'token'), 'already_linked');
    perform t.login('s3');
    perform t.ok(not (public.get_invite_preview(r ->> 'token') ->> 'already_linked')::boolean, 'preview: aluno sem vínculo com o professor = not already_linked');
    perform t.anon();
    perform t.ok(not (public.get_invite_preview(r ->> 'token') ->> 'already_linked')::boolean, 'preview sem login = not already_linked');
    raise exception 'desfaz_segundo_convite';
  exception when others then
    if sqlerrm <> 'desfaz_segundo_convite' then raise; end if;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 11. Convite recusado, reenvio e exclusão da própria conta
-- ---------------------------------------------------------------------
do $$
declare r jsonb; v_s3 uuid := (t.get('st_s3'))::uuid; v_w uuid;
begin
  perform t.login('s3');
  perform public.decline_invite(t.get('inv_s3'));
  perform t.err(format($q$ select public.accept_student_invite(%L) $q$, t.get('inv_s3')), 'invite_declined');
  perform t.ok(public.get_invite_preview(t.get('inv_s3')) ->> 'state' = 'declined', 'preview: convite recusado');
  perform t.login('admin');                                                -- regra 137: recusado vem antes do bloqueio
  perform public.set_teacher_status(t.uid('t2'), 'blocked');
  perform t.ok(public.get_invite_preview(t.get('inv_s3')) ->> 'state' = 'declined', 'preview: recusado de professor bloqueado = declined');
  perform public.set_teacher_status(t.uid('t2'), 'active');
  perform t.login('t2');
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s3) = 'convite_recusado', 'lista: convite recusado');
  r := public.reissue_invite((select id from public.invites where student_id = v_s3 order by created_at desc limit 1));
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s3) = 'convite_pendente', 'enviar novo convite volta a pendente');
  perform t.su();
  update public.invites set expires_at = now() - interval '1 second' where student_id = v_s3 and status = 'pending';
  perform t.login('t2');
  perform t.ok((select list_status from public.teacher_student_list where student_id = v_s3) = 'convite_expirado', 'lista: convite expirado');
  r := public.reissue_invite((select id from public.invites where student_id = v_s3 order by created_at desc limit 1), 'caio.novo@x.com');
  perform t.ok((select email from public.students where id = v_s3) = 'caio.novo@x.com', 'corrigir e-mail atualiza o cadastro');

  perform t.login('s3');
  perform public.accept_student_invite(r ->> 'token');
  perform public.accept_data_notice();
  perform public.save_student_profile('Caio', date '1999-05-05', '+5511988887777', 1.80, 80);
  perform t.login('t2');
  v_w := public.save_workout(v_s3, null, jsonb_build_object('name','Caio A','start_date', t.today(), 'weeks', 4,
      'days', jsonb_build_array(t.day(null,'A', array[t.item('Supino reto com barra', 3, '10')]))));
  perform t.login('s3');
  perform public.mark_done(t.dayid(v_w, 'A'), t.today(), gen_random_uuid());
  perform public.set_load(t.exid('Supino reto com barra'), 30, gen_random_uuid());
  perform public.request_new_workout();
  perform t.login('t1');
  perform t.err($q$ select public.delete_my_account() $q$, 'forbidden');

  perform t.su();
  perform t.put('exercises_before', (select count(*) from public.exercises)::text);
  perform t.login('s3');
  perform public.delete_my_account();
  perform t.su();
  perform t.ok(not exists (select 1 from auth.users where id = t.uid('s3')), 'conta apagada');
  perform t.ok(not exists (select 1 from public.profiles where id = t.uid('s3')) and not exists (select 1 from public.students where user_id = t.uid('s3') or id = v_s3), 'perfil e vínculo apagados');
  perform t.ok(not exists (select 1 from public.workouts where id = v_w) and not exists (select 1 from public.completions where student_id = v_s3)
               and not exists (select 1 from public.student_exercise_loads where user_id = t.uid('s3')) and not exists (select 1 from public.load_history where user_id = t.uid('s3'))
               and not exists (select 1 from public.training_requests where student_id = v_s3) and not exists (select 1 from public.student_profiles where user_id = t.uid('s3')), 'treinos, marcações, cargas, pedidos e perfil apagados em cascata');
  perform t.ok((select count(*) from public.exercises)::text = t.get('exercises_before'), 'exercícios do professor permanecem');
  perform t.login('t2');
  perform t.ok((select count(*) from public.teacher_student_list where student_id = v_s3) = 0, 'aluno some da lista do professor');
end $$;

-- ---------------------------------------------------------------------
-- 12. Aluno vira professor (regra 93) e aluno bloqueado (regra 119)
-- ---------------------------------------------------------------------
do $$
declare r jsonb; v_st uuid;
begin
  perform t.login('t1');
  r := public.create_student_with_invite('Bia', 's2@x.com');
  v_st := (r ->> 'student_id')::uuid;
  perform t.login('s2');
  perform public.accept_student_invite(r ->> 'token');
  perform t.ok((select count(*) from public.students where status = 'active') = 1, 'Bia vinculada ao professor 1');
  perform t.login('admin');
  r := public.create_teacher_invite('Bia Prof', 's2@x.com');
  perform t.login('s2');
  perform public.accept_teacher_invite(r ->> 'token');
  perform t.ok((select role from public.profiles where id = auth.uid()) = 'professor', 'conta de aluno virou professor');
  perform t.su();
  perform t.ok((select status || '/' || archive_reason from public.students where id = v_st) = 'archived/became_teacher', 'vínculo de aluno arquivado ao virar professor (dados guardados, sem acesso)');
  perform t.login('t1');
  perform t.ok((select count(*) from public.teacher_student_list where student_id = v_st) = 0, 'sai da lista do professor atual');
  perform t.login('s2');
  perform public.create_student_with_invite('Aluno da Bia');
  perform t.err(format($q$ select public.accept_student_invite('x') $q$), 'role_not_allowed');

  -- aluno bloqueado (a ação de bloquear aluno é do futuro; a barreira já existe)
  perform t.su();
  update public.profiles set status = 'blocked' where id = t.uid('s4');
  perform t.login('s4');
  perform t.ok((select status from public.profiles where id = auth.uid()) = 'blocked', 'aluno bloqueado lê o próprio perfil');
  perform t.err($q$ select public.accept_data_notice() $q$, 'forbidden');
  perform t.err($q$ select public.delete_my_account() $q$, 'forbidden');
end $$;

-- ---------------------------------------------------------------------
-- 13. Fuso horário e nome
-- ---------------------------------------------------------------------
do $$ begin
  perform t.login('s1');
  perform t.err($q$ update public.profiles set timezone = 'Marte/Olimpo' where id = auth.uid() $q$, 'timezone_invalid');
  update public.profiles set timezone = 'Pacific/Kiritimati' where id = auth.uid();
  perform t.ok(private.user_today(auth.uid()) = t.today('Pacific/Kiritimati'), '"hoje" segue o fuso do aluno');
  perform t.ok(private.student_today((t.get('st_s1_t2'))::uuid) = t.today('Pacific/Kiritimati'), '"hoje" do vínculo usa o fuso do aluno');
  update public.profiles set timezone = 'America/Sao_Paulo' where id = auth.uid();
  perform t.err($q$ update public.profiles set full_name = ' ' where id = auth.uid() $q$, 'name_required');
  update public.profiles set full_name = 'Ana S.' where id = auth.uid();
  perform t.login('t2');
  perform t.ok((select name from public.students where id = (t.get('st_s1_t2'))::uuid) = 'Ana S.', 'professor vê o nome atualizado');
end $$;

-- ---------------------------------------------------------------------
-- 14. Sem sessão
-- ---------------------------------------------------------------------
do $$ begin
  perform t.su();
  execute 'set local role authenticated';                                  -- logado sem "sub"
  perform t.err($q$ select public.request_new_workout() $q$, 'forbidden');
  perform t.err($q$ select public.accept_student_invite('x') $q$, 'not_authenticated');
  perform t.ok((select count(*) from public.profiles) = 0, 'sem sessão não lê nada');
end $$;

-- ---------------------------------------------------------------------
-- 15. Treino antes do aceite do convite (regra 122)
-- ---------------------------------------------------------------------
do $$
declare
  r jsonb; v_d uuid; v_e uuid; v_f uuid; v_wa uuid; v_ws uuid; v_we uuid; v_wf uuid; v_base jsonb;
begin
  perform t.su();
  perform t.ok(not exists (select 1 from auth.users where lower(email) = 's5@x.com'), 'aluno do convite ainda não tem conta');
  perform t.login('t1');
  r := public.create_student_with_invite('Duda', 's5@x.com');
  v_d := (r ->> 'student_id')::uuid;
  perform t.put('st_s5', v_d::text); perform t.put('inv_s5_id', r ->> 'invite_id');
  perform t.ok((select user_id is null and status = 'invited' from public.students where id = v_d), 'vínculo sem conta, com convite pendente');
  v_base := jsonb_build_object('name', 'Base', 'start_date', t.today(), 'weeks', 8,
    'days', jsonb_build_array(
      t.day(null, 'Peito', array[t.item('Supino reto com barra', 4, '10')]),
      t.day(null, 'Costas', array[t.item('Puxada frontal na polia alta', 4, '10')])));

  -- criar (início hoje) e agendar para convite pendente; regras de data valem
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_d, (v_base || jsonb_build_object('start_date', t.today() - 1))::text), 'start_in_past');
  v_wa := public.save_workout(v_d, null, v_base);
  perform t.put('w_s5_a', v_wa::text);
  perform t.ok((select list_status = 'convite_pendente' and current_workout_id = v_wa from public.teacher_student_list where student_id = v_d), 'regra 122: treino para convite pendente; lista segue "convite pendente"');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_d, v_base::text), 'start_date_taken');
  v_ws := public.save_workout(v_d, null, v_base || jsonb_build_object('name', 'Agendado', 'start_date', t.today() + 14, 'weeks', 4));
  perform t.put('w_s5_s', v_ws::text);
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_d, (v_base || jsonb_build_object('start_date', t.today() + 30))::text), 'scheduled_exists');
  perform t.ok((select list_status = 'convite_pendente' and scheduled_workout_id = v_ws from public.teacher_student_list where student_id = v_d), 'convite pendente com treino agendado: lista segue "convite pendente"');

  -- editar o ativo e o agendado
  perform t.err(format($q$ select public.save_workout(%L, %L, %L::jsonb) $q$, v_d, v_wa, (v_base || '{"weeks":9}')::text), 'active_workout_dates_locked');
  perform public.save_workout(v_d, v_wa, jsonb_build_object('name', 'Base (v2)', 'start_date', t.today(), 'weeks', 8,
    'days', jsonb_build_array(
      t.day(t.dayid(v_wa, 'A'), 'Peito (v2)', array[t.item('Supino reto com barra', 5, '8')]),
      t.day(null, 'Pernas', array[t.item('Agachamento livre com barra', 4, '8')]))));
  perform t.ok((select string_agg(letter || case when removed_at is null then '' else '(removida)' end, ',' order by letter) from public.workout_days where workout_id = v_wa) = 'A,B(removida),C'
               and (select name from public.workouts where id = v_wa) = 'Base (v2)', 'editar treino ativo de convite pendente');
  perform public.save_workout(v_d, v_ws, v_base || jsonb_build_object('name', 'Agendado (alterado)', 'start_date', t.today() + 10, 'weeks', 4));
  perform t.ok((select start_date = t.today() + 10 and name = 'Agendado (alterado)' from public.workouts where id = v_ws), 'editar treino agendado de convite pendente');

  -- leitura: o professor lê treino, fichas e exercícios; outro professor, não
  perform t.su();
  perform t.put('n_w', (select count(*) from public.workouts where student_id = v_d)::text);
  perform t.put('n_d', (select count(*) from public.workout_days d join public.workouts w on w.id = d.workout_id where w.student_id = v_d)::text);
  perform t.put('n_e', (select count(*) from public.workout_exercises e join public.workout_days d on d.id = e.day_id join public.workouts w on w.id = d.workout_id where w.student_id = v_d)::text);
  perform t.login('t1');
  perform t.ok((select count(*) from public.workouts where student_id = v_d)::text = t.get('n_w') and t.get('n_w') = '2', 'professor lê os treinos do convite pendente');
  perform t.ok((select count(*) from public.workout_days d join public.workouts w on w.id = d.workout_id where w.student_id = v_d)::text = t.get('n_d')
               and (select count(*) from public.workout_exercises e join public.workout_days d on d.id = e.day_id join public.workouts w on w.id = d.workout_id where w.student_id = v_d)::text = t.get('n_e'), 'professor lê fichas e exercícios do convite pendente');
  perform t.login('t2');
  perform t.ok((select count(*) from public.workouts where id in (v_wa, v_ws)) = 0
               and (select count(*) from public.workout_days where workout_id in (v_wa, v_ws)) = 0
               and (select count(*) from public.workout_exercises e where e.day_id in (select id from public.workout_days where workout_id in (v_wa, v_ws))) = 0, 'outro professor não lê treino de convite pendente');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_d, (v_base || jsonb_build_object('start_date', t.today() + 3))::text), 'student_not_found');
  perform t.err(format($q$ select public.save_workout(%L, %L, %L::jsonb) $q$, v_d, v_ws, v_base::text), 'student_not_found');

  -- convite expirado e convite recusado
  perform t.login('t1');
  r := public.create_student_with_invite('Eva');
  v_e := (r ->> 'student_id')::uuid; perform t.put('inv_e_id', r ->> 'invite_id');
  r := public.create_student_with_invite('Fábio', 's6@x.com');
  v_f := (r ->> 'student_id')::uuid; perform t.put('inv_f', r ->> 'token'); perform t.put('inv_f_id', r ->> 'invite_id');
  perform t.su();
  update public.invites set expires_at = now() - interval '1 second' where student_id = v_e and status = 'pending';
  insert into auth.users (id, email, email_confirmed_at) values (t.uid('s6'), 's6@x.com', now());
  perform t.login('s6');
  perform public.decline_invite(t.get('inv_f'));
  perform t.login('t1');
  v_we := public.save_workout(v_e, null, v_base || '{"name":"Eva A"}');
  perform t.ok((select list_status = 'convite_expirado' and current_workout_id = v_we from public.teacher_student_list where student_id = v_e), 'treino para convite expirado; lista segue "convite expirado"');
  v_wf := public.save_workout(v_f, null, v_base || jsonb_build_object('name', 'Fábio agendado', 'start_date', t.today() + 7));
  perform t.ok((select list_status = 'convite_recusado' and scheduled_workout_id = v_wf from public.teacher_student_list where student_id = v_f), 'treino agendado para convite recusado; lista segue "convite recusado"');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_f, (v_base || jsonb_build_object('start_date', t.today() + 8))::text), 'scheduled_exists');
  perform t.ok((select count(*) from public.workouts where id in (v_we, v_wf)) = 2, 'professor lê treinos de convite expirado e recusado');
  perform t.put('st_e', v_e::text); perform t.put('st_f', v_f::text);
  perform t.put('w_e', v_we::text); perform t.put('w_f', v_wf::text);
end $$;

-- reenviar / gerar novo convite mantém o treino (regra 58). Transação
-- própria: o convite novo precisa de created_at posterior ao anterior.
do $$
declare
  r jsonb; v_d uuid := (t.get('st_s5'))::uuid; v_e uuid := (t.get('st_e'))::uuid; v_f uuid := (t.get('st_f'))::uuid;
  v_wa uuid := (t.get('w_s5_a'))::uuid; v_ws uuid := (t.get('w_s5_s'))::uuid;
  v_we uuid := (t.get('w_e'))::uuid; v_wf uuid := (t.get('w_f'))::uuid;
begin
  perform t.login('t1');
  r := public.reissue_invite((t.get('inv_e_id'))::uuid);
  perform t.ok((select list_status = 'convite_pendente' and current_workout_id = v_we from public.teacher_student_list where student_id = v_e), 'gerar novo convite (expirado) mantém o treino');
  r := public.reissue_invite((t.get('inv_f_id'))::uuid);
  perform t.ok((select list_status = 'convite_pendente' and scheduled_workout_id = v_wf from public.teacher_student_list where student_id = v_f), 'gerar novo convite (recusado) mantém o treino agendado');
  r := public.reissue_invite((t.get('inv_s5_id'))::uuid);
  perform t.put('inv_s5', r ->> 'token');
  perform t.ok((select count(*) from public.workouts where student_id = v_d) = 2
               and (select current_workout_id = v_wa and scheduled_workout_id = v_ws from public.teacher_student_list where student_id = v_d), 'reenviar convite pendente mantém ativo e agendado');
end $$;

do $$
declare
  r jsonb; v_d uuid := (t.get('st_s5'))::uuid; v_wa uuid := (t.get('w_s5_a'))::uuid; v_ws uuid := (t.get('w_s5_s'))::uuid;
begin
  -- o aluno cria a conta e aceita: o treino ativo já está lá
  perform t.su();
  insert into auth.users (id, email, email_confirmed_at) values (t.uid('s5'), 's5@x.com', now());
  perform t.login('s5');
  perform t.ok((select count(*) from public.workouts) = 0, 'antes do aceite a conta nova não vê o treino');
  r := public.accept_student_invite(t.get('inv_s5'));
  perform t.ok((r ->> 'needs_first_access')::boolean and (r ->> 'student_id')::uuid = v_d, 'aceite vincula o mesmo cadastro (o treino continua nele)');
  perform t.ok(private.current_workout_id(v_d) = v_wa, 'treino feito antes do aceite é o atual');
  perform t.ok((select count(*) from public.workouts) = 1 and (select id from public.workouts) = v_wa, 'aluno vê o treino ativo; o agendado fica oculto');
  perform t.ok(not exists (select 1 from public.workout_days where workout_id = v_ws)
               and (select count(*) from public.workout_days where workout_id = v_wa) = 3, 'fichas do agendado ocultas; as do ativo visíveis');
  perform t.ok(public.pending_new_workout_notice() ->> 'workout_id' = v_wa::text, 'pop-up "Seu treino novo chegou" no primeiro acesso');
  perform public.acknowledge_new_workout(v_wa);
  perform t.login('t1');
  perform t.ok((select list_status = 'ativo' and current_workout_id = v_wa and scheduled_workout_id = v_ws from public.teacher_student_list where student_id = v_d), 'lista: depois do aceite, aluno ativo com treino e agendado');
end $$;

do $$
declare
  v_d uuid := (t.get('st_s5'))::uuid; v_wa uuid := (t.get('w_s5_a'))::uuid; v_ws uuid := (t.get('w_s5_s'))::uuid;
  r jsonb; v_bt uuid; v_ok jsonb;
begin
  -- chega a data do agendado: o aluno passa a vê-lo, com o pop-up
  perform t.su();
  update public.workouts set start_date = t.today() - 5 where id = v_wa;
  update public.workouts set start_date = t.today() where id = v_ws;
  perform t.login('s5');
  perform t.ok((select count(*) from public.workouts) = 2 and private.current_workout_id(v_d) = v_ws, 'agendado aparece ao aluno na data de início');
  perform t.ok(public.pending_new_workout_notice() ->> 'workout_id' = v_ws::text, 'pop-up do agendado que entrou em vigor');

  -- vínculo arquivado (troca de professor) segue bloqueado
  perform t.login('t2');
  r := public.create_student_with_invite('Duda (prof 2)', 's5@x.com');
  perform t.login('s5');
  perform public.accept_student_invite(r ->> 'token', true);
  v_ok := jsonb_build_object('name', 'X', 'start_date', t.today() + 3, 'weeks', 4,
    'days', jsonb_build_array(t.day(null, 'A', array[t.item('Supino reto com barra', 3, '10')])));
  perform t.login('t1');
  perform t.ok((select count(*) from public.workouts where student_id = v_d) = 0 and (select count(*) from public.teacher_student_list where student_id = v_d) = 0, 'arquivado (troca): professor antigo não lê treinos nem lista');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_d, v_ok::text), 'student_not_found');
  perform t.err(format($q$ select public.save_workout(%L, %L, %L::jsonb) $q$, v_d, v_ws, v_ok::text), 'student_not_found');

  -- vínculo arquivado (virou professor) segue bloqueado
  perform t.su();
  select id into v_bt from public.students where teacher_id = t.uid('t1') and archive_reason = 'became_teacher';
  perform t.login('t1');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, v_bt, v_ok::text), 'student_not_found');
  perform t.err(format($q$ select public.save_workout(%L, null, %L::jsonb) $q$, (t.get('st_s1'))::uuid, v_ok::text), 'student_not_found');
end $$;

select 'FIM: todos os testes passaram' as resultado;
