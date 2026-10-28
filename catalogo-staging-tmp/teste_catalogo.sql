-- ---------------------------------------------------------------------
-- 6b. Catálogo de exercícios (migration 0007)
-- ---------------------------------------------------------------------
do $$
declare v_ex public.exercises;
begin
  perform t.su();
  perform t.ok((select count(*) from public.exercises where owner_id is null) = 249, '249 exercícios pré-definidos');
  perform t.ok((select count(*) from public.muscle_groups) = 15 and (select count(*) from public.equipment) = 55, '15 grupos musculares e 55 equipamentos');
  perform t.ok((select count(distinct muscle_group) from public.exercises where owner_id is null) = 15, 'os 15 grupos têm exercício');
  perform t.ok((select count(*) from public.exercises where owner_id is null and (slug is null or catalog_version is null)) = 0, 'todo pré-definido tem slug e versão do catálogo');
  perform t.ok((select count(*) from public.exercises where owner_id is not null and (slug is not null or catalog_version is not null)) = 0, 'exercício de professor não tem slug nem versão');
  perform t.ok((select count(*) from public.exercise_equipment where position = 1) = 249, 'cada exercício tem um equipamento principal');
  perform t.err($q$ update public.exercises set slug = 'x' where owner_id is not null $q$, 'exercises_catalog_fields_check');
  perform t.err($q$ update public.exercises set slug = 'supino-reto-com-barra' where slug = 'crucifixo-na-maquina' $q$, 'exercises_slug_key');
  perform t.err($q$ update public.exercises set muscle_group = 'Inventado' where slug = 'prancha-frontal' $q$, 'exercises_muscle_group_fkey');

  -- Escolha A: os 149 da 0004 foram renomeados no lugar (mesmo id). Eles nasceram no
  -- mesmo INSERT, então todos têm o created_at do Supino reto com barra.
  perform t.ok((select count(*) from public.exercises where owner_id is null
                 and created_at = (select created_at from public.exercises where slug = 'supino-reto-com-barra')) = 149,
               'os 149 exercícios da 0004 seguem com o mesmo id');
  perform t.ok(not exists (select 1 from public.exercises where name = 'Voador (peck deck)'), 'nome antigo deixa de existir');
  perform t.ok(exists (select 1 from public.exercises
                        where name = 'Crucifixo na máquina' and slug = 'crucifixo-na-maquina'
                          and created_at = (select created_at from public.exercises where slug = 'supino-reto-com-barra')),
               'Voador (peck deck) virou Crucifixo na máquina com o mesmo id');
  perform t.ok((select muscle_group from public.exercises where slug = 'levantamento-terra-convencional') = 'Posterior de coxa', 'levantamento terra mudou de grupo');

  -- Carga e medida
  perform t.ok((select count(*) from public.exercises where owner_id is null and load_mode = 'none') = 38, '38 exercícios sem carga');
  perform t.ok((select count(*) from public.exercises where owner_id is null and measure = 'time') = 5, '5 exercícios medidos em tempo');
  perform t.ok(exists (select 1 from public.exercises where slug = 'prancha-frontal' and load_mode = 'none' and measure = 'time'), 'prancha frontal: sem carga, em tempo');

  -- Leitura: aluno lê as listas, mas só enxerga equipamento de exercício que pode ver
  perform t.login('s1');
  perform t.ok((select count(*) from public.equipment) = 55 and (select count(*) from public.muscle_groups) = 15, 'aluno lê grupos e equipamentos');
  perform t.ok((select count(*) from public.exercise_equipment) = 0, 'aluno não vê equipamento de exercício que não está nas fichas dele');
  perform t.anon();
  perform t.err($q$ select * from public.equipment $q$, 'permission denied');

  -- Professor: lê tudo, não escreve
  perform t.login('t1');
  perform t.ok((select count(*) from public.exercise_equipment) > 249, 'professor lê os equipamentos do catálogo');
  perform t.err($q$ insert into public.muscle_groups (name, sort_order) values ('Novo', 99) $q$, 'permission denied');
  perform t.err($q$ update public.equipment set name = 'x' $q$, 'permission denied');
  perform t.err($q$ insert into public.exercise_equipment (exercise_id, equipment_slug, position) select id, 'halteres', 9 from public.exercises limit 1 $q$, 'permission denied');
  perform t.err($q$ update public.exercises set name = 'x' where owner_id is null $q$, 'permission denied');

  -- Busca e aviso de parecido olham os apelidos
  perform t.ok(exists (select 1 from public.search_exercises('PULLEY') where name = 'Puxada alta aberta'), 'busca "PULLEY" encontra Puxada alta aberta pelo apelido');
  perform t.ok(exists (select 1 from public.search_exercises('voador') where name = 'Crucifixo na máquina'), 'busca "voador" encontra Crucifixo na máquina');
  perform t.ok(exists (select 1 from public.search_exercises('bench press') where name = 'Supino reto com barra'), 'busca por apelido em inglês');
  perform t.ok(exists (select 1 from public.similar_exercises('Pulley') where name = 'Puxada alta aberta'), 'aviso de parecido por apelido igual');
  perform t.ok(exists (select 1 from public.similar_exercises('Supino reto barra') where name = 'Supino reto com barra'), 'aviso de parecido por nome');

  -- create_exercise: carga, medida e grupo
  v_ex := public.create_exercise('Prancha do Coach', 'Abdômen', 'none', 'time');
  perform t.ok(v_ex.load_mode = 'none' and v_ex.measure = 'time' and v_ex.slug is null and v_ex.owner_id = t.uid('t1'), 'exercício criado com carga "não" e medida em tempo');
  v_ex := public.create_exercise('Rosca Coach', 'Bíceps');
  perform t.ok(v_ex.load_mode = 'required' and v_ex.measure = 'reps', 'padrão: pede carga, em repetições');
  perform t.err($q$ select public.create_exercise('Teste A', 'Inventado') $q$, 'muscle_group_invalid');
  perform t.err($q$ select public.create_exercise('Teste B', null, 'talvez') $q$, 'load_mode_invalid');
  perform t.err($q$ select public.create_exercise('Teste C', null, 'none', 'minutos') $q$, 'measure_invalid');
  perform t.err($q$ select public.create_exercise('Pulldown com braços estendidos') $q$, 'exercise_exists');
  perform t.su();
end $$;

