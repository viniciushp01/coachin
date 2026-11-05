-- 0013 · Regra 157 (6) e (7): ordem do aviso "Já existe um exercício parecido" e ocultos fora dele.
-- O aviso mostra um resultado só: nome igual ao digitado, depois apelido igual, depois similaridade
-- e por fim nome. Quem chama não vê o que ocultou; outro professor continua vendo. O filtro é o
-- mesmo de search_exercises. `create or replace` mantém os grants e a assinatura da 0007.
create or replace function public.similar_exercises(p_name text) returns setof public.exercises
language sql stable security invoker set search_path = public, extensions as $$
  select e.*
    from (select private.normalize_name(p_name) as n) q
    cross join public.exercises e
   where private.my_role() = 'professor'
     and q.n <> ''
     and not exists (select 1 from public.exercise_hidden h
                      where h.teacher_id = (select auth.uid()) and h.exercise_id = e.id)
     and (extensions.similarity(e.name_normalized, q.n) > 0.45
          or strpos(e.name_normalized, q.n) > 0
          or strpos(q.n, e.name_normalized) > 0
          or q.n = any (string_to_array(e.aliases_normalized, ' | ')))
   order by (e.name_normalized = q.n) desc,
            (q.n = any (string_to_array(e.aliases_normalized, ' | '))) desc,
            extensions.similarity(e.name_normalized, q.n) desc,
            e.name_normalized
   limit 5
$$;
