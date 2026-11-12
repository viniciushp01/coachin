-- =====================================================================
-- 0016 · Estado do pedido de novo treino, visto pelo aluno (regras 40, 52
-- e 103; fatia 7b, #143)
-- =====================================================================
-- O aluno precisa saber se o professor já agiu para mostrar ou esconder
-- "Cancelar solicitação" (regra 103). O estado é derivado em
-- private.request_state, que olha o treino agendado; esse treino é oculto
-- para o aluno (regra 2). Esta função devolve só o rótulo, sem expor o
-- treino:
--   'none'  = sem pedido aberto (nunca pediu, cancelou, ou o treino novo
--             já entrou em vigor: o pedido foi atendido);
--   'open'  = pedido aberto, o professor ainda não agiu (pode cancelar);
--   'acted' = pedido aberto, o professor já montou um treino que ainda
--             não começou (só "Solicitação enviada").
-- Sem vínculo ativo devolve 'none' (a tela "sem treino" não quebra).
-- Só leitura: nada muda em training_requests (quem fecha o atendido segue
-- sendo request_new_workout).
-- =====================================================================

create or replace function public.my_request_status() returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_link  uuid;
  v_state text;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  v_link := private.my_active_link();
  if v_link is null then return 'none'; end if;

  select private.request_state(r.student_id, r.created_at, r.status) into v_state
    from public.training_requests r
   where r.student_id = v_link and r.status = 'open';

  return case when v_state in ('open', 'acted') then v_state else 'none' end;
end $$;

revoke all on function public.my_request_status() from public, anon;
grant execute on function public.my_request_status() to authenticated;
